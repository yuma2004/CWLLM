import { Prisma, PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = new PrismaClient()

const managedKeys = [
  'NODE_ENV',
  'BACKEND_PORT',
  'PORT',
  'CHATWORK_API_TOKEN',
  'CHATWORK_API_BASE_URL',
  'CHATWORK_AUTO_SYNC_INTERVAL_MINUTES',
  'CHATWORK_AUTO_SYNC_ROOM_LIMIT',
  'REDIS_URL',
] as const

type ManagedKey = (typeof managedKeys)[number]
type ManagedOverrides = Partial<Record<ManagedKey, string | undefined>>

const originalEnv: Record<ManagedKey, string | undefined> = managedKeys.reduce(
  (acc, key) => ({
    ...acc,
    [key]: process.env[key],
  }),
  {} as Record<ManagedKey, string | undefined>
)

const originalFetch = globalThis.fetch
const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

type MessagesModule = Awaited<typeof import('./messages')>
type JobQueueModule = Awaited<typeof import('./jobQueue')>

let messagesModule: MessagesModule | null = null
let jobQueueModule: JobQueueModule | null = null
let companySequence = 0
let roomSequence = 0

const restoreManagedEnv = () => {
  for (const key of managedKeys) {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

const applyManagedEnv = (overrides: ManagedOverrides) => {
  for (const key of managedKeys) {
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) continue
    const value = overrides[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

const loadMessagesModule = async (overrides: ManagedOverrides = {}) => {
  restoreManagedEnv()
  applyManagedEnv(overrides)
  vi.resetModules()
  messagesModule = await import('./messages')
  jobQueueModule = await import('./jobQueue')
  return messagesModule
}

const cleanupDatabase = async () => {
  await prisma.job.deleteMany()
  await prisma.message.deleteMany()
  await prisma.companyRoomLink.deleteMany()
  await prisma.chatworkRoom.deleteMany()
  await prisma.company.deleteMany({
    where: {
      normalizedName: {
        contains: 'messages-test-company-',
      },
    },
  })
}

const createCompany = async () => {
  companySequence += 1
  return prisma.company.create({
    data: {
      name: `Messages Test Company ${companySequence}`,
      normalizedName: `messages-test-company-${companySequence}`,
      status: 'active',
      tags: [],
    },
  })
}

const createRoom = async (options: {
  isActive: boolean
  lastSyncAt?: Date | null
  lastErrorAt?: Date | null
  lastErrorStatus?: number | null
}) => {
  roomSequence += 1
  return prisma.chatworkRoom.create({
    data: {
      roomId: `messages-test-room-${roomSequence}`,
      name: `Messages Test Room ${roomSequence}`,
      isActive: options.isActive,
      lastSyncAt: options.lastSyncAt ?? null,
      lastErrorAt: options.lastErrorAt ?? null,
      lastErrorStatus: options.lastErrorStatus ?? null,
    },
  })
}

const waitForJobCount = async (expectedCount: number) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const count = await prisma.job.count()
    if (count >= expectedCount) return
    await Promise.resolve()
  }
  throw new Error(`Timed out waiting for jobs. expected >= ${expectedCount}`)
}

const extractRoomIdFromPayload = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return null
  const roomId = (payload as { roomId?: unknown }).roomId
  return typeof roomId === 'string' ? roomId : null
}

const queryMessageIds = async (whereSql: Prisma.Sql) => {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "messages" ${whereSql} ORDER BY "sentAt" DESC`
  )
  return rows.map((row) => row.id)
}

describe('messages service', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(async () => {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(async () => {
    if (jobQueueModule) {
      await jobQueueModule.closeJobQueue()
    }
    messagesModule = null
    jobQueueModule = null
    await cleanupDatabase()
    restoreManagedEnv()
    vi.restoreAllMocks()
    vi.resetModules()
    globalThis.fetch = originalFetch
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('ラベル正規化は空白除去と不正値の除外を行う', async () => {
    const { normalizeMessageLabel } = await loadMessagesModule({
      NODE_ENV: 'test',
    })

    expect(normalizeMessageLabel(undefined)).toBeUndefined()
    expect(normalizeMessageLabel('  VIP  ')).toBe('VIP')
    expect(normalizeMessageLabel('   ')).toBeNull()
    expect(normalizeMessageLabel('bad\nlabel')).toBeNull()
    expect(normalizeMessageLabel('x'.repeat(5), 4)).toBeNull()
  })

  it('紐づくチャットワークルームがない会社は同期ジョブを投入しない', async () => {
    const { enqueueOnDemandRoomSync } = await loadMessagesModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '1',
    })
    const company = await createCompany()

    await enqueueOnDemandRoomSync(company.id)

    expect(await prisma.job.count()).toBe(0)
  })

  it('tokenまたはredisが未設定なら同期ジョブ投入をスキップする', async () => {
    const { enqueueOnDemandRoomSync } = await loadMessagesModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: '',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '1',
    })
    const company = await createCompany()
    const room = await createRoom({ isActive: true, lastSyncAt: null })
    await prisma.companyRoomLink.create({
      data: {
        companyId: company.id,
        chatworkRoomId: room.id,
      },
    })

    await enqueueOnDemandRoomSync(company.id)
    expect(await prisma.job.count()).toBe(0)
  })

  it('非アクティブなルームはオンデマンド同期対象から除外する', async () => {
    const { enqueueOnDemandRoomSync } = await loadMessagesModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '1',
    })
    const company = await createCompany()
    const room = await createRoom({ isActive: false })
    await prisma.companyRoomLink.create({
      data: {
        companyId: company.id,
        chatworkRoomId: room.id,
      },
    })

    await enqueueOnDemandRoomSync(company.id)

    expect(await prisma.job.count()).toBe(0)
  })

  it('直近同期済みルームは最小間隔内では再同期しない', async () => {
    const { enqueueOnDemandRoomSync } = await loadMessagesModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '10',
    })
    const company = await createCompany()
    const room = await createRoom({
      isActive: true,
      lastSyncAt: new Date(),
    })
    await prisma.companyRoomLink.create({
      data: {
        companyId: company.id,
        chatworkRoomId: room.id,
      },
    })

    await enqueueOnDemandRoomSync(company.id)

    expect(await prisma.job.count()).toBe(0)
  })

  it('429エラー直後のルームはクールダウン中は再同期しない', async () => {
    const { enqueueOnDemandRoomSync } = await loadMessagesModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '5',
    })
    const company = await createCompany()
    const room = await createRoom({
      isActive: true,
      lastErrorStatus: 429,
      lastErrorAt: new Date(),
    })
    await prisma.companyRoomLink.create({
      data: {
        companyId: company.id,
        chatworkRoomId: room.id,
      },
    })

    await enqueueOnDemandRoomSync(company.id)

    expect(await prisma.job.count()).toBe(0)
  })

  it('ルーム上限がある場合は同期対象を古い順で絞り込む', async () => {
    const { enqueueOnDemandRoomSync } = await loadMessagesModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '1',
      CHATWORK_AUTO_SYNC_ROOM_LIMIT: '2',
    })
    const company = await createCompany()
    const now = Date.now()
    const oldest = await createRoom({
      isActive: true,
      lastSyncAt: new Date(now - 30 * 60_000),
    })
    const middle = await createRoom({
      isActive: true,
      lastSyncAt: new Date(now - 20 * 60_000),
    })
    const newest = await createRoom({
      isActive: true,
      lastSyncAt: new Date(now - 10 * 60_000),
    })

    await prisma.companyRoomLink.createMany({
      data: [
        { companyId: company.id, chatworkRoomId: oldest.id },
        { companyId: company.id, chatworkRoomId: middle.id },
        { companyId: company.id, chatworkRoomId: newest.id },
      ],
    })

    await enqueueOnDemandRoomSync(company.id)
    await waitForJobCount(2)

    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'asc' },
    })
    expect(jobs).toHaveLength(2)
    const roomIds = jobs
      .map((job) => extractRoomIdFromPayload(job.payload))
      .filter((roomId): roomId is string => roomId !== null)

    expect(roomIds).toHaveLength(2)
    expect(roomIds).toEqual(expect.arrayContaining([oldest.roomId, middle.roomId]))
    expect(roomIds).not.toContain(newest.roomId)
  })

  it('検索条件SQLはcompanyId=nullを正しく表現する', async () => {
    const { buildMessageSearchWhere } = await loadMessagesModule({
      NODE_ENV: 'test',
    })

    const company = await createCompany()
    const room = await createRoom({ isActive: true, lastSyncAt: null })
    const assigned = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'builder-a',
        sender: 'sender',
        body: 'assigned',
        sentAt: new Date('2026-02-20T00:00:00.000Z'),
        companyId: company.id,
      },
    })
    const unassigned = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'builder-b',
        sender: 'sender',
        body: 'unassigned',
        sentAt: new Date('2026-02-21T00:00:00.000Z'),
      },
    })

    const whereSql = buildMessageSearchWhere({ companyId: null })
    const ids = await queryMessageIds(whereSql)

    expect(ids).toContain(unassigned.id)
    expect(ids).not.toContain(assigned.id)
  })

  it('検索条件SQLはmessageId・label・期間を組み合わせて絞り込む', async () => {
    const { buildMessageSearchWhere } = await loadMessagesModule({
      NODE_ENV: 'test',
    })

    const company = await createCompany()
    const room = await createRoom({ isActive: true, lastSyncAt: null })
    const hit = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'combo-hit',
        sender: 'sender',
        body: 'combo',
        sentAt: new Date('2026-02-22T00:00:00.000Z'),
        companyId: company.id,
        labels: ['VIP'],
      },
    })
    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'combo-miss',
        sender: 'sender',
        body: 'combo',
        sentAt: new Date('2026-02-23T00:00:00.000Z'),
        companyId: company.id,
        labels: ['LOW'],
      },
    })

    const whereSql = buildMessageSearchWhere({
      messageId: 'combo-hit',
      label: 'VIP',
      fromDate: new Date('2026-02-21T00:00:00.000Z'),
      toDate: new Date('2026-02-22T23:59:59.000Z'),
    })
    const ids = await queryMessageIds(whereSql)

    expect(ids).toEqual([hit.id])
  })

  it('検索条件SQLは本文クエリを全文検索へ反映する', async () => {
    const { buildMessageSearchWhere } = await loadMessagesModule({
      NODE_ENV: 'test',
    })

    const room = await createRoom({ isActive: true, lastSyncAt: null })
    const matched = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'fts-1',
        sender: 'sender',
        body: 'alpha beta',
        sentAt: new Date('2026-02-24T00:00:00.000Z'),
      },
    })
    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'fts-2',
        sender: 'sender',
        body: 'gamma',
        sentAt: new Date('2026-02-24T01:00:00.000Z'),
      },
    })

    const whereSql = buildMessageSearchWhere({ query: 'alpha' })
    const ids = await queryMessageIds(whereSql)

    expect(ids).toContain(matched.id)
    expect(ids).toHaveLength(1)
  })
})
