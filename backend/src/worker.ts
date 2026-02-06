import { env } from './config/env'
import { startChatworkAutoSync, stopChatworkAutoSync } from './services/chatworkScheduler'
import { closeJobQueue, initJobQueue } from './services/jobQueue'
import { prisma } from './utils'

const queue = initJobQueue(console, { enableQueue: true, enableWorker: true })

if (!queue) {
  console.error('Job queue is not available. Set REDIS_URL to enable workers.')
  process.exit(1)
}

console.log(`Job worker started (${env.nodeEnv})`)

const chatworkTimer = startChatworkAutoSync(console)

const handleFatal = async (label: string, error: unknown) => {
  console.error(`[worker] ${label}`, error)
  try {
    stopChatworkAutoSync(chatworkTimer)
    await closeJobQueue()
    await prisma.$disconnect()
  } finally {
    process.exit(1)
  }
}

process.on('unhandledRejection', (reason) => {
  void handleFatal('unhandledRejection', reason)
})

process.on('uncaughtException', (error) => {
  void handleFatal('uncaughtException', error)
})

const shutdown = async (signal: string) => {
  console.log(`Worker received shutdown signal: ${signal}`)
  stopChatworkAutoSync(chatworkTimer)
  await closeJobQueue()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
