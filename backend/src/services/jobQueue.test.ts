import { JobStatus, JobType, PrismaClient, UserRole } from '@prisma/client'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = new PrismaClient()

const managedKeys = [
  'NODE_ENV',
  'BACKEND_PORT',
  'PORT',
  'JWT_SECRET',
  'CHATWORK_API_TOKEN',
  'CHATWORK_API_BASE_URL',
  'REDIS_URL',
  'JOB_WORKER_ENABLED',
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

let closeJobQueue: null | (() => Promise<void>) = null
let userSequence = 0
let lastQueueMock: {
  add: ReturnType<typeof vi.fn>
  getJob: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
} | null = null
let removedJob = vi.fn(async () => undefined)

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

const loadJobQueueModule = async (overrides: ManagedOverrides = {}) => {
  restoreManagedEnv()
  applyManagedEnv(overrides)
  vi.resetModules()
  const module = await import('./jobQueue')
  closeJobQueue = module.closeJobQueue
  return module
}

const loadJobQueueModuleWithQueueMocks = async (
  overrides: ManagedOverrides = {},
  options: { addShouldThrow?: boolean; mockSyncMessages?: boolean; initQueue?: boolean } = {}
) => {
  restoreManagedEnv()
  applyManagedEnv(overrides)
  vi.resetModules()
  removedJob = vi.fn(async () => undefined)

  class FakeRedis {
    on = vi.fn(() => this)
    quit = vi.fn(async () => 'OK')
  }

  class FakeQueue {
    add = vi.fn(async () => {
      if (options.addShouldThrow) {
        throw new Error('queue add failed')
      }
      return { id: 'mock-job' }
    })

    getJob = vi.fn(async () => ({ remove: removedJob }))
    close = vi.fn(async () => undefined)
    on = vi.fn(() => this)
  }

  class FakeWorker {
    close = vi.fn(async () => undefined)
    on = vi.fn(() => this)
  }

  vi.doMock('ioredis', () => ({
    default: FakeRedis,
  }))
  vi.doMock('bullmq', () => ({
    Queue: FakeQueue,
    Worker: FakeWorker,
    Job: class {},
  }))

  if (options.mockSyncMessages) {
    vi.doMock('./chatworkSync', () => ({
      syncChatworkRooms: vi.fn(async () => ({ created: 0, updated: 0, total: 0 })),
      syncChatworkMessages: vi.fn(async () => {
        const latest = await prisma.job.findFirst({
          where: { type: JobType.chatwork_messages_sync },
          orderBy: { createdAt: 'desc' },
        })
        const progress = latest?.result as
          | { totalRooms?: number; processedRooms?: number }
          | undefined
          | null
        if (!progress || progress.processedRooms !== 0 || progress.totalRooms === undefined) {
          throw new Error('initial progress was not persisted')
        }
        return {
          rooms: [{ roomId: 'mock-room', fetched: 1 }],
          errors: [],
        }
      }),
    }))
  }

  const module = await import('./jobQueue')
  closeJobQueue = module.closeJobQueue
  if (options.initQueue !== false) {
    const queue = module.initJobQueue(undefined, { enableQueue: true, enableWorker: false })
    expect(queue).not.toBeNull()
    lastQueueMock = queue as unknown as typeof lastQueueMock
  }
  return module
}

const cleanupDatabase = async () => {
  await prisma.job.deleteMany()
  await prisma.message.deleteMany()
  await prisma.companyRoomLink.deleteMany()
  await prisma.chatworkRoom.deleteMany()
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'job-queue-test-',
      },
    },
  })
}

const createTestUser = async () => {
  userSequence += 1
  return prisma.user.create({
    data: {
      email: `job-queue-test-${userSequence}@example.com`,
      password: 'password123',
      role: UserRole.employee,
    },
  })
}

describe('jobQueue', () => {
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
    if (closeJobQueue) {
      await closeJobQueue()
      closeJobQueue = null
    }
    lastQueueMock = null
    await cleanupDatabase()
    restoreManagedEnv()
    vi.restoreAllMocks()
    vi.resetModules()
    globalThis.fetch = originalFetch
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('Redis未設定のテスト環境では同期ジョブをフォールバック実行して完了する', async () => {
    const { enqueueChatworkRoomsSync } = await loadJobQueueModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'test-token',
      CHATWORK_API_BASE_URL: 'https://api.chatwork.test',
      REDIS_URL: undefined,
    })

    const job = await enqueueChatworkRoomsSync()

    expect(job.type).toBe(JobType.chatwork_rooms_sync)
    expect(job.status).toBe(JobStatus.completed)
    const saved = await prisma.job.findUnique({ where: { id: job.id } })
    expect(saved?.status).toBe(JobStatus.completed)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('本番環境でキュー未初期化の場合はジョブ投入を拒否する', async () => {
    const { enqueueChatworkRoomsSync } = await loadJobQueueModule({
      NODE_ENV: 'production',
      BACKEND_PORT: '3000',
      JWT_SECRET: '1234567890123456',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_API_TOKEN: 'test-token',
    })

    await expect(enqueueChatworkRoomsSync()).rejects.toThrow('Job queue is not available')

    const jobs = await prisma.job.findMany({
      where: { type: JobType.chatwork_rooms_sync },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })
    expect(jobs).toHaveLength(1)
    expect(jobs[0]?.status).toBe(JobStatus.queued)
  })

  it('メッセージ同期ジョブのpayloadとuserIdを保存する', async () => {
    const user = await createTestUser()

    const { enqueueChatworkMessagesSync } = await loadJobQueueModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'test-token',
      REDIS_URL: undefined,
    })

    const job = await enqueueChatworkMessagesSync('room-001', user.id, { roomLimit: 3 })

    expect(job.type).toBe(JobType.chatwork_messages_sync)
    const saved = await prisma.job.findUnique({ where: { id: job.id } })
    expect(saved?.userId).toBe(user.id)
    expect(saved?.payload).toEqual({
      roomId: 'room-001',
      roomLimit: 3,
    })
  })

  it('cancelJobは対象ジョブをcanceledに更新し、未存在IDはnullを返す', async () => {
    const { cancelJob } = await loadJobQueueModule({
      NODE_ENV: 'test',
      REDIS_URL: undefined,
    })

    const created = await prisma.job.create({
      data: {
        type: JobType.chatwork_rooms_sync,
        status: JobStatus.queued,
        payload: {},
      },
    })

    const canceled = await cancelJob(created.id)
    expect(canceled?.status).toBe(JobStatus.canceled)
    expect(canceled?.finishedAt).not.toBeNull()

    const missing = await cancelJob('missing-job-id')
    expect(missing).toBeNull()
  })

  it('トークン未設定時の同期ジョブはfailedになりエラー内容を保存する', async () => {
    const { enqueueChatworkRoomsSync } = await loadJobQueueModule({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: '',
      REDIS_URL: undefined,
    })

    const job = await enqueueChatworkRoomsSync()

    expect(job.status).toBe(JobStatus.failed)
    const saved = await prisma.job.findUnique({ where: { id: job.id } })
    expect(saved?.status).toBe(JobStatus.failed)
    const error = saved?.error as { message?: string } | null | undefined
    expect(error?.message).toContain('CHATWORK_API_TOKEN is not set')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('queue.add失敗時はジョブをfailed化してエラーを保存する', async () => {
    const { enqueueChatworkRoomsSync } = await loadJobQueueModuleWithQueueMocks(
      {
        NODE_ENV: 'test',
        CHATWORK_API_TOKEN: 'token',
        REDIS_URL: 'redis://localhost:6379',
      },
      { addShouldThrow: true }
    )

    await expect(enqueueChatworkRoomsSync()).rejects.toThrow('queue add failed')

    const failed = await prisma.job.findFirst({
      where: { type: JobType.chatwork_rooms_sync },
      orderBy: { createdAt: 'desc' },
    })
    expect(failed?.status).toBe(JobStatus.failed)
    const error = failed?.error as { message?: string } | null | undefined
    expect(error?.message).toContain('queue add failed')
  })

  it('queue有効時のcancelJobはBull job removeを呼び出す', async () => {
    const { cancelJob } = await loadJobQueueModuleWithQueueMocks({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      REDIS_URL: 'redis://localhost:6379',
    })

    const created = await prisma.job.create({
      data: {
        type: JobType.chatwork_rooms_sync,
        status: JobStatus.queued,
        payload: {},
      },
    })

    const canceled = await cancelJob(created.id)
    expect(canceled?.status).toBe(JobStatus.canceled)
    expect(lastQueueMock?.getJob).toHaveBeenCalledWith(created.id)
    expect(removedJob).toHaveBeenCalled()
  })

  it('メッセージ同期実行時は初期進捗を保存してからsummaryを反映する', async () => {
    const { enqueueChatworkMessagesSync } = await loadJobQueueModuleWithQueueMocks(
      {
        NODE_ENV: 'test',
        CHATWORK_API_TOKEN: 'token',
        REDIS_URL: undefined,
      },
      { mockSyncMessages: true, initQueue: false }
    )

    await prisma.chatworkRoom.create({
      data: {
        roomId: 'job-queue-progress-room',
        name: 'Progress Room',
        isActive: true,
      },
    })

    const job = await enqueueChatworkMessagesSync(undefined, undefined, { roomLimit: 1 })
    expect(job.status).toBe(JobStatus.completed)

    const saved = await prisma.job.findUnique({ where: { id: job.id } })
    expect(saved?.status).toBe(JobStatus.completed)
    expect(saved?.result).toEqual({
      rooms: [{ roomId: 'mock-room', fetched: 1 }],
      errors: [],
    })
  })
})
