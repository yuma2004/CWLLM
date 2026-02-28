import { JobType, PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = new PrismaClient()

const managedKeys = [
  'NODE_ENV',
  'BACKEND_PORT',
  'PORT',
  'JWT_SECRET',
  'CHATWORK_API_TOKEN',
  'CHATWORK_API_BASE_URL',
  'CHATWORK_AUTO_SYNC_ENABLED',
  'CHATWORK_AUTO_SYNC_INTERVAL_MINUTES',
  'CHATWORK_AUTO_SYNC_ROOM_LIMIT',
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

type SchedulerModule = Awaited<typeof import('./chatworkScheduler')>
type JobQueueModule = Awaited<typeof import('./jobQueue')>

let schedulerModule: SchedulerModule | null = null
let jobQueueModule: JobQueueModule | null = null
let activeTimer: NodeJS.Timeout | null = null

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

const installRedisMock = (setResults: Array<'OK' | null> = ['OK']) => {
  class FakeRedis {
    on = vi.fn(() => this)
    set = vi.fn(async () => {
      if (setResults.length === 0) return 'OK'
      const next = setResults.shift()
      return next === undefined ? 'OK' : next
    })
    eval = vi.fn(async () => 1)
    quit = vi.fn(async () => 'OK')
  }

  vi.doMock('ioredis', () => ({
    default: FakeRedis,
  }))
}

const loadSchedulerModule = async (
  overrides: ManagedOverrides = {},
  options: { redisSetResults?: Array<'OK' | null> } = {}
) => {
  restoreManagedEnv()
  applyManagedEnv(overrides)
  vi.resetModules()
  installRedisMock(options.redisSetResults)
  schedulerModule = await import('./chatworkScheduler')
  jobQueueModule = await import('./jobQueue')
  return schedulerModule
}

const cleanupDatabase = async () => {
  await prisma.job.deleteMany()
  await prisma.message.deleteMany()
  await prisma.companyRoomLink.deleteMany()
  await prisma.chatworkRoom.deleteMany()
}

const waitForJobCount = async (expectedCount: number) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const count = await prisma.job.count()
    if (count >= expectedCount) return
    await Promise.resolve()
  }
  throw new Error(`Timed out waiting for jobs. expected >= ${expectedCount}`)
}

describe('chatworkScheduler', () => {
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
    if (schedulerModule) {
      schedulerModule.stopChatworkAutoSync(activeTimer ?? undefined)
    }
    activeTimer = null
    if (jobQueueModule) {
      await jobQueueModule.closeJobQueue()
    }
    schedulerModule = null
    jobQueueModule = null
    await cleanupDatabase()
    restoreManagedEnv()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.resetModules()
    globalThis.fetch = originalFetch
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('自動同期が無効ならタイマーを開始しない', async () => {
    const module = await loadSchedulerModule({
      NODE_ENV: 'test',
      CHATWORK_AUTO_SYNC_ENABLED: 'false',
      JOB_WORKER_ENABLED: 'true',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_API_TOKEN: 'token',
    })

    const timer = module.startChatworkAutoSync()
    expect(timer).toBeNull()
  })

  it('ワーカー無効時は警告を出して開始しない', async () => {
    const module = await loadSchedulerModule({
      NODE_ENV: 'test',
      CHATWORK_AUTO_SYNC_ENABLED: 'true',
      JOB_WORKER_ENABLED: 'false',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_API_TOKEN: 'token',
    })

    const warn = vi.fn()
    const timer = module.startChatworkAutoSync({ warn })

    expect(timer).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      { reason: 'JOB_WORKER_ENABLED is false' },
      'Chatwork auto-sync disabled'
    )
  })

  it('Redis未設定時は警告を出して開始しない', async () => {
    const module = await loadSchedulerModule({
      NODE_ENV: 'test',
      CHATWORK_AUTO_SYNC_ENABLED: 'true',
      JOB_WORKER_ENABLED: 'true',
      REDIS_URL: '',
      CHATWORK_API_TOKEN: 'token',
    })

    const warn = vi.fn()
    const timer = module.startChatworkAutoSync({ warn })

    expect(timer).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      { reason: 'REDIS_URL is not set' },
      'Chatwork auto-sync disabled'
    )
  })

  it('トークン未設定時は警告を出して開始しない', async () => {
    const module = await loadSchedulerModule({
      NODE_ENV: 'test',
      CHATWORK_AUTO_SYNC_ENABLED: 'true',
      JOB_WORKER_ENABLED: 'true',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_API_TOKEN: '',
    })

    const warn = vi.fn()
    const timer = module.startChatworkAutoSync({ warn })

    expect(timer).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      { reason: 'CHATWORK_API_TOKEN is not set' },
      'Chatwork auto-sync disabled'
    )
  })

  it('有効設定では即時実行と間隔実行で同期ジョブを投入し、停止後は追加投入しない', async () => {
    vi.useFakeTimers()
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const module = await loadSchedulerModule({
      NODE_ENV: 'test',
      CHATWORK_AUTO_SYNC_ENABLED: 'true',
      CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '1',
      JOB_WORKER_ENABLED: 'true',
      REDIS_URL: 'redis://localhost:6379',
      CHATWORK_API_TOKEN: 'token',
    })

    activeTimer = module.startChatworkAutoSync()
    expect(activeTimer).not.toBeNull()

    await waitForJobCount(2)
    const firstRunTypes = await prisma.job.findMany({
      select: { type: true },
      orderBy: { createdAt: 'asc' },
    })
    expect(firstRunTypes.slice(0, 2).map((item) => item.type)).toEqual([
      JobType.chatwork_rooms_sync,
      JobType.chatwork_messages_sync,
    ])
    expect(setIntervalSpy).toHaveBeenCalled()

    module.stopChatworkAutoSync(activeTimer)
    activeTimer = null

    const afterStop = await prisma.job.count()
    await vi.advanceTimersByTimeAsync(60_000)
    const finalCount = await prisma.job.count()
    expect(finalCount).toBe(afterStop)
    expect(mockFetch).toHaveBeenCalled()
  })

  it('ロック取得に失敗した周期では同期ジョブを投入しない', async () => {
    const module = await loadSchedulerModule(
      {
        NODE_ENV: 'test',
        CHATWORK_AUTO_SYNC_ENABLED: 'true',
        CHATWORK_AUTO_SYNC_INTERVAL_MINUTES: '1',
        JOB_WORKER_ENABLED: 'true',
        REDIS_URL: 'redis://localhost:6379',
        CHATWORK_API_TOKEN: 'token',
      },
      { redisSetResults: ['OK', null] }
    )

    activeTimer = module.startChatworkAutoSync()
    expect(activeTimer).not.toBeNull()

    await waitForJobCount(2)
    const firstCount = await prisma.job.count()
    expect(firstCount).toBe(2)

    module.stopChatworkAutoSync(activeTimer)
    activeTimer = null

    const secondTimer = module.startChatworkAutoSync()
    expect(secondTimer).not.toBeNull()
    await Promise.resolve()
    await Promise.resolve()

    const secondRunCount = await prisma.job.count()
    expect(secondRunCount).toBe(2)

    module.stopChatworkAutoSync(secondTimer)
  })
})
