import { randomUUID } from 'node:crypto'
import IORedis from 'ioredis'
import { env } from '../config/env'
import { enqueueChatworkMessagesSync, enqueueChatworkRoomsSync } from './jobQueue'

type Logger = {
  info?: (obj: unknown, msg?: string) => void
  warn?: (obj: unknown, msg?: string) => void
}

const toIntervalMs = (minutes: number) => Math.max(1, minutes) * 60_000
const LOCK_KEY = 'cwllm:chatwork:auto-sync-lock'
const LOCK_TTL_MIN_MS = 60_000
const LOCK_RELEASE_LUA =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end'
let lockClient: IORedis | null = null
let activeTimer: NodeJS.Timeout | null = null

const getLockClient = (logger?: Logger) => {
  if (!lockClient && env.redisUrl) {
    lockClient = new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
    lockClient.on('error', (err) => {
      logger?.warn?.({ err }, 'Chatwork auto-sync lock redis error')
    })
  }
  return lockClient
}

const acquireSyncLock = async (ttlMs: number, logger?: Logger) => {
  const client = getLockClient(logger)
  if (!client) return null
  const token = randomUUID()
  const result = await client.set(LOCK_KEY, token, 'PX', ttlMs, 'NX')
  return result === 'OK' ? token : null
}

const releaseSyncLock = async (token: string) => {
  if (!lockClient) return
  try {
    await lockClient.eval(LOCK_RELEASE_LUA, 1, LOCK_KEY, token)
  } catch {
    // ignore lock release errors
  }
}

export const startChatworkAutoSync = (logger?: Logger) => {
  if (!env.chatworkAutoSyncEnabled) return null
  if (!env.jobWorkerEnabled) {
    logger?.warn?.({ reason: 'JOB_WORKER_ENABLED is false' }, 'Chatwork auto-sync disabled')
    return null
  }
  if (!env.redisUrl) {
    logger?.warn?.({ reason: 'REDIS_URL is not set' }, 'Chatwork auto-sync disabled')
    return null
  }
  if (!env.chatworkApiToken) {
    logger?.warn?.({ reason: 'CHATWORK_API_TOKEN is not set' }, 'Chatwork auto-sync disabled')
    return null
  }

  const intervalMinutes = env.chatworkAutoSyncIntervalMinutes
  const intervalMs = toIntervalMs(intervalMinutes)
  const lockTtlMs = Math.max(intervalMs * 2, LOCK_TTL_MIN_MS)
  const roomLimit = env.chatworkAutoSyncRoomLimit
  let running = false

  const run = async () => {
    if (running) return
    running = true
    let token: string | null = null
    try {
      token = await acquireSyncLock(lockTtlMs, logger)
      if (!token) return
      const roomsJob = await enqueueChatworkRoomsSync()
      const messagesJob = await enqueueChatworkMessagesSync(undefined, undefined, {
        roomLimit,
      })
      logger?.info?.(
        { roomsJobId: roomsJob.id, messagesJobId: messagesJob.id },
        'Chatwork auto-sync enqueued'
      )
    } catch (error) {
      logger?.warn?.({ err: error }, 'Chatwork auto-sync failed to enqueue')
    } finally {
      if (token) {
        await releaseSyncLock(token)
      }
      running = false
    }
  }

  void run()
  const timer = setInterval(() => {
    void run()
  }, intervalMs)

  logger?.info?.({ intervalMinutes }, 'Chatwork auto-sync scheduled')
  activeTimer = timer
  return timer
}

export const stopChatworkAutoSync = (timer?: NodeJS.Timeout | null) => {
  const target = timer ?? activeTimer
  if (target) {
    clearInterval(target)
  }
  activeTimer = null
  if (lockClient) {
    void lockClient.quit()
    lockClient = null
  }
}
