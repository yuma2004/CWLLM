import { env } from '../config/env'
import { enqueueChatworkMessagesSync, enqueueChatworkRoomsSync } from './jobQueue'

type Logger = {
  info?: (obj: unknown, msg?: string) => void
  warn?: (obj: unknown, msg?: string) => void
}

const toIntervalMs = (minutes: number) => Math.max(1, minutes) * 60_000

export const startChatworkAutoSync = (logger?: Logger) => {
  if (!env.chatworkAutoSyncEnabled) return null
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
  let running = false

  const run = async () => {
    if (running) return
    running = true
    try {
      const roomsJob = await enqueueChatworkRoomsSync()
      const messagesJob = await enqueueChatworkMessagesSync(undefined)
      logger?.info?.(
        { roomsJobId: roomsJob.id, messagesJobId: messagesJob.id },
        'Chatwork auto-sync enqueued'
      )
    } catch (error) {
      logger?.warn?.({ err: error }, 'Chatwork auto-sync failed to enqueue')
    } finally {
      running = false
    }
  }

  void run()
  const timer = setInterval(() => {
    void run()
  }, intervalMs)

  logger?.info?.({ intervalMinutes }, 'Chatwork auto-sync scheduled')
  return timer
}
