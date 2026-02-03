import { Queue, Worker, Job as BullJob, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import { JobStatus, JobType, Prisma } from '@prisma/client'
import { env } from '../config/env'
import { prisma } from '../utils'
import { syncChatworkMessages, syncChatworkRooms } from './chatworkSync'
import { JobCanceledError } from './jobErrors'

const QUEUE_NAME = 'cwllm-jobs'

type JobQueueLogger = {
  info?: (obj: unknown, msg?: string) => void
  warn?: (obj: unknown, msg?: string) => void
  error?: (obj: unknown, msg?: string) => void
}

let queue: Queue | null = null
let worker: Worker | null = null
// BullMQ requires maxRetriesPerRequest: null for long-running jobs.
let connection: IORedis | null = env.redisUrl
  ? new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
  : null

type JobQueueOptions = {
  enableQueue?: boolean
  enableWorker?: boolean
}

type ChatworkMessagesPayload = {
  roomId?: string
  roomLimit?: number
}

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { message: String(error) }
}

const isCanceled = async (jobId: string) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { status: true },
  })
  return job?.status === JobStatus.canceled
}

const toJsonInput = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue

const updateProgress = async (jobId: string, result: Prisma.InputJsonValue) => {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      result,
    },
  })
}

const buildSyncLogger = (logger?: JobQueueLogger) =>
  logger?.warn ? { warn: (message: string) => logger.warn?.(message) } : undefined

const handleChatworkRoomsSync = async (jobId: string, logger?: JobQueueLogger) => {
  const syncLogger = buildSyncLogger(logger)
  const syncResult = await syncChatworkRooms(() => isCanceled(jobId), syncLogger)
  return toJsonInput(syncResult)
}

const handleChatworkMessagesSync = async (
  jobId: string,
  payload: Prisma.JsonValue,
  logger?: JobQueueLogger
) => {
  const syncLogger = buildSyncLogger(logger)
  const parsedPayload = payload as ChatworkMessagesPayload | null
  const roomId = parsedPayload?.roomId
  const roomLimit = parsedPayload?.roomLimit
  const rooms = await prisma.chatworkRoom.count({
    where: roomId ? { roomId } : { isActive: true },
  })
  const totalRooms = roomId || !roomLimit ? rooms : Math.min(rooms, roomLimit)
  await updateProgress(jobId, toJsonInput({ totalRooms, processedRooms: 0 }))

  const data = await syncChatworkMessages(
    roomId,
    async () => {
      const canceled = await isCanceled(jobId)
      return canceled
    },
    syncLogger,
    { roomLimit }
  )
  const processed = data.rooms.length + data.errors.length
  await updateProgress(
    jobId,
    toJsonInput({ totalRooms, processedRooms: processed, summary: data })
  )
  return toJsonInput(data)
}

const executeJob = async (
  jobId: string,
  type: JobType,
  payload: Prisma.JsonValue,
  logger?: JobQueueLogger
) => {
  if (await isCanceled(jobId)) {
    return null
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: JobStatus.processing, startedAt: new Date() },
  })

  try {
    let result: Prisma.InputJsonValue

    switch (type) {
      case JobType.chatwork_rooms_sync:
        result = await handleChatworkRoomsSync(jobId, logger)
        break
      case JobType.chatwork_messages_sync:
        result = await handleChatworkMessagesSync(jobId, payload, logger)
        break
      default:
        throw new Error(`Unknown job type: ${type}`)
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.completed,
        result,
        finishedAt: new Date(),
      },
    })

    return result
  } catch (error) {
    if (error instanceof JobCanceledError) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.canceled, finishedAt: new Date() },
      })
      return null
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.failed,
        error: toJsonInput(serializeError(error)),
        finishedAt: new Date(),
      },
    })
    throw error
  }
}

const processBullJob = async (job: BullJob, logger?: JobQueueLogger) => {
  const jobId = (job.data as { jobId?: string }).jobId
  if (!jobId) return null

  const dbJob = await prisma.job.findUnique({ where: { id: jobId } })
  if (!dbJob) return null
  if (dbJob.status === JobStatus.canceled) return null

  return executeJob(jobId, dbJob.type, dbJob.payload, logger)
}

export const initJobQueue = (
  logger?: JobQueueLogger,
  options: JobQueueOptions = {}
) => {
  const { enableQueue = true, enableWorker = true } = options
  if (!connection && env.redisUrl) {
    connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
  }
  if (!connection) return null
  const connectionOptions = connection as unknown as ConnectionOptions
  if (enableQueue && !queue) {
    queue = new Queue(QUEUE_NAME, { connection: connectionOptions })
    queue.on('error', (err) => {
      logger?.error?.({ err }, 'job queue error')
    })
  }
  if (enableWorker && !worker) {
    worker = new Worker(QUEUE_NAME, (job) => processBullJob(job, logger), {
      connection: connectionOptions,
    })
    worker.on('completed', (job) => {
      logger?.info?.({ jobId: job.id, jobName: job.name }, 'job completed')
    })
    worker.on('failed', (job, err) => {
      logger?.error?.(
        { jobId: job?.id, jobName: job?.name, attemptsMade: job?.attemptsMade, err },
        'job failed'
      )
    })
    worker.on('stalled', (jobId) => {
      logger?.warn?.({ jobId }, 'job stalled')
    })
    worker.on('error', (err) => {
      logger?.error?.({ err }, 'job worker error')
    })
  }
  return queue
}

export const closeJobQueue = async () => {
  const tasks: Array<Promise<unknown>> = []
  if (worker) {
    tasks.push(worker.close())
  }
  if (queue) {
    tasks.push(queue.close())
  }
  if (connection) {
    tasks.push(
      connection.quit().catch(() => undefined)
    )
  }
  await Promise.allSettled(tasks)
  worker = null
  queue = null
  connection = null
}

export const enqueueJob = async (
  type: JobType,
  payload: Prisma.InputJsonValue,
  userId?: string
) => {
  const job = await prisma.job.create({
    data: {
      type,
      status: JobStatus.queued,
      payload,
      userId,
    },
  })

  if (queue) {
    try {
      await queue.add(type, { jobId: job.id }, {
        jobId: job.id,
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 500,
      })
    } catch (error) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.failed,
          error: toJsonInput(serializeError(error)),
          finishedAt: new Date(),
        },
      })
      throw error
    }
  } else {
    if (env.nodeEnv === 'production') {
      throw new Error('Job queue is not available')
    }
    try {
      await executeJob(job.id, job.type, job.payload)
    } catch {
      // Job status is already updated inside executeJob
    }
    const refreshed = await prisma.job.findUnique({ where: { id: job.id } })
    return refreshed ?? job
  }

  return job
}

export const enqueueChatworkRoomsSync = (userId?: string) =>
  enqueueJob(JobType.chatwork_rooms_sync, {}, userId)

export const enqueueChatworkMessagesSync = (
  roomId: string | undefined,
  userId?: string,
  options: { roomLimit?: number } = {}
) => enqueueJob(JobType.chatwork_messages_sync, { roomId, roomLimit: options.roomLimit }, userId)

export const cancelJob = async (jobId: string) => {
  const existing = await prisma.job.findUnique({ where: { id: jobId } })
  if (!existing) return null

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      status: JobStatus.canceled,
      finishedAt: new Date(),
    },
  })

  if (queue) {
    const queuedJob = await queue.getJob(jobId)
    if (queuedJob) {
      await queuedJob.remove()
    }
  }

  return updated
}
