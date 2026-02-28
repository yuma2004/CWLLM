import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = new PrismaClient()

const managedKeys = [
  'NODE_ENV',
  'BACKEND_PORT',
  'PORT',
  'CHATWORK_API_TOKEN',
  'CHATWORK_API_BASE_URL',
  'CHATWORK_NEW_ROOMS_ACTIVE',
] as const

type ManagedKey = (typeof managedKeys)[number]
type ManagedOverrides = Partial<Record<ManagedKey, string | undefined>>
type SyncModule = Awaited<typeof import('./chatworkSync')>

const originalEnv: Record<ManagedKey, string | undefined> = managedKeys.reduce(
  (acc, key) => ({
    ...acc,
    [key]: process.env[key],
  }),
  {} as Record<ManagedKey, string | undefined>
)

const originalFetch = globalThis.fetch
const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
let syncModule: SyncModule | null = null
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

const loadSyncModule = async (overrides: ManagedOverrides = {}) => {
  restoreManagedEnv()
  applyManagedEnv(overrides)
  vi.resetModules()
  syncModule = await import('./chatworkSync')
  return syncModule
}

const createCompany = async () => {
  companySequence += 1
  return prisma.company.create({
    data: {
      name: `chatwork-sync-company-${companySequence}`,
      normalizedName: `chatwork-sync-company-${companySequence}`,
      status: 'active',
      tags: [],
    },
  })
}

const createRoom = async (params: {
  lastSyncAt?: Date | null
  lastMessageId?: string | null
  isActive?: boolean
}) => {
  roomSequence += 1
  return prisma.chatworkRoom.create({
    data: {
      roomId: `chatwork-sync-room-${roomSequence}`,
      name: `Chatwork Sync Room ${roomSequence}`,
      isActive: params.isActive ?? true,
      lastSyncAt: params.lastSyncAt ?? null,
      lastMessageId: params.lastMessageId ?? null,
    },
  })
}

const cleanupDatabase = async () => {
  await prisma.message.deleteMany()
  await prisma.companyRoomLink.deleteMany()
  await prisma.chatworkRoom.deleteMany()
  await prisma.company.deleteMany({
    where: {
      normalizedName: {
        startsWith: 'chatwork-sync-company-',
      },
    },
  })
}

describe('chatworkSync service', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(async () => {
    await cleanupDatabase()
    restoreManagedEnv()
    vi.restoreAllMocks()
    vi.resetModules()
    globalThis.fetch = originalFetch
    syncModule = null
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('ルーム上限では未同期ルームを優先し、不足分を最終同期の古い順で補完する', async () => {
    const module = await loadSyncModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      CHATWORK_API_BASE_URL: 'https://api.chatwork.test',
    })

    const unsyncedA = await createRoom({ lastSyncAt: null })
    const unsyncedB = await createRoom({ lastSyncAt: null })
    const syncedOld = await createRoom({
      lastSyncAt: new Date('2026-02-20T00:00:00.000Z'),
      lastMessageId: '1',
    })
    await createRoom({
      lastSyncAt: new Date('2026-02-25T00:00:00.000Z'),
      lastMessageId: '1',
    })

    const calledRoomIds: string[] = []
    mockFetch.mockImplementation(async (input) => {
      const url = input.toString()
      const match = url.match(/\/rooms\/([^/]+)\/messages/)
      if (match) {
        calledRoomIds.push(match[1] ?? '')
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    await module.syncChatworkMessages(undefined, undefined, undefined, { roomLimit: 3 })

    expect(calledRoomIds).toHaveLength(3)
    expect(calledRoomIds).toEqual(
      expect.arrayContaining([unsyncedA.roomId, unsyncedB.roomId, syncedOld.roomId])
    )
  })

  it('メッセージ同期は途中キャンセル時にJobCanceledErrorを投げる', async () => {
    const module = await loadSyncModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      CHATWORK_API_BASE_URL: 'https://api.chatwork.test',
    })

    await createRoom({ lastSyncAt: null })
    await createRoom({ lastSyncAt: null })

    let callCount = 0
    const shouldCancel = async () => {
      callCount += 1
      return callCount >= 2
    }

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(module.syncChatworkMessages(undefined, shouldCancel)).rejects.toThrow(
      'Job canceled'
    )
  })

  it('ルーム同期は事前キャンセル時にAPI呼び出しを行わない', async () => {
    const module = await loadSyncModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      CHATWORK_API_BASE_URL: 'https://api.chatwork.test',
    })

    await expect(module.syncChatworkRooms(async () => true)).rejects.toThrow('Job canceled')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('会社リンクが複数あるルームは自動紐付けを避けて警告する', async () => {
    const module = await loadSyncModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      CHATWORK_API_BASE_URL: 'https://api.chatwork.test',
    })

    const companyA = await createCompany()
    const companyB = await createCompany()
    const room = await createRoom({ lastSyncAt: null })

    await prisma.companyRoomLink.createMany({
      data: [
        { companyId: companyA.id, chatworkRoomId: room.id },
        { companyId: companyB.id, chatworkRoomId: room.id },
      ],
    })

    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify([{ message_id: '100', body: 'hello', send_time: 1700000100 }]),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    )

    const warn = vi.fn()
    await module.syncChatworkMessages(room.roomId, undefined, { warn })

    const saved = await prisma.message.findFirst({
      where: { roomId: room.roomId, messageId: '100' },
    })
    expect(saved?.companyId).toBeNull()
    expect(saved?.sender).toBe('unknown')
    expect(warn).toHaveBeenCalled()
  })

  it('APIエラー時はエラーメッセージを500文字以内に切り詰めて保存する', async () => {
    const module = await loadSyncModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      CHATWORK_API_BASE_URL: 'https://api.chatwork.test',
    })

    const room = await createRoom({ lastSyncAt: null })
    const longBody = 'x'.repeat(900)
    mockFetch.mockResolvedValue(
      new Response(longBody, {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      })
    )

    const result = await module.syncChatworkMessages(room.roomId)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.message.length).toBeLessThanOrEqual(500)
    expect(result.errors[0]?.message.endsWith('...')).toBe(true)

    const updatedRoom = await prisma.chatworkRoom.findUnique({ where: { id: room.id } })
    expect(updatedRoom?.lastErrorStatus).toBe(500)
    expect(updatedRoom?.lastErrorMessage?.length).toBeLessThanOrEqual(500)
  })
})
