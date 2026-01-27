import { env } from './config/env'
import { startChatworkAutoSync } from './services/chatworkScheduler'
import { initJobQueue } from './services/jobQueue'

const queue = initJobQueue(console, { enableQueue: true, enableWorker: true })

if (!queue) {
  console.error('Job queue is not available. Set REDIS_URL to enable workers.')
  process.exit(1)
}

console.log(`Job worker started (${env.nodeEnv})`)

startChatworkAutoSync(console)
