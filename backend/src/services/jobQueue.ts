import { Queue, Worker, Job as BullJob, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import { JobStatus, JobType, Prisma } from '@prisma/client'
import { env } from '../config/env'
import { prisma } from '../utils'
import { generateSummaryDraft } from './summaryGenerator'
import { JobCanceledError, syncChatworkMessages, syncChatworkRooms } from './chatworkSync'

const QUEUE_NAME = 'cwllm-jobs'

let queue: Queue | null = null
let worker: Worker | null = null
// BullMQでは maxRetriesPerRequest: null が必須
const connection = env.redisUrl
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

const handleChatworkRoomsSync = async (
  jobId: string,
  logger?: { warn: (message: string) => void }
) => {
  const syncResult = await syncChatworkRooms(() => isCanceled(jobId), logger)
  return toJsonInput(syncResult)
}

const handleChatworkMessagesSync = async (
  jobId: string,
  payload: Prisma.JsonValue,
  logger?: { warn: (message: string) => void }
) => {
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
    logger,
    { roomLimit }
  )
  const processed = data.rooms.length + data.errors.length
  await updateProgress(
    jobId,
    toJsonInput({ totalRooms, processedRooms: processed, summary: data })
  )
  return toJsonInput(data)
}

const handleSummaryDraft = async (payload: Prisma.JsonValue) => {
  const typedPayload = payload as { companyId: string; periodStart: string; periodEnd: string }
  const draft = await generateSummaryDraft(
    typedPayload.companyId,
    new Date(typedPayload.periodStart),
    new Date(typedPayload.periodEnd)
  )
  return toJsonInput({
    draft: {
      id: draft.id,
      companyId: draft.companyId,
      periodStart: draft.periodStart.toISOString(),
      periodEnd: draft.periodEnd.toISOString(),
      content: draft.content,
      sourceLinks: draft.sourceLinks,
      model: draft.model,
      promptVersion: draft.promptVersion,
      sourceMessageCount: draft.sourceMessageCount,
      tokenUsage: draft.tokenUsage ?? null,
    },
  })
}

const executeJob = async (
  jobId: string,
  type: JobType,
  payload: Prisma.JsonValue,
  logger?: { warn: (message: string) => void }
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
      case JobType.summary_draft:
        result = await handleSummaryDraft(payload)
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

const processBullJob = async (job: BullJob, logger?: { warn: (message: string) => void }) => {
  const jobId = (job.data as { jobId?: string }).jobId
  if (!jobId) return null

  const dbJob = await prisma.job.findUnique({ where: { id: jobId } })
  if (!dbJob) return null
  if (dbJob.status === JobStatus.canceled) return null

  return executeJob(jobId, dbJob.type, dbJob.payload, logger)
}

export const initJobQueue = (
  logger?: { warn: (message: string) => void },
  options: JobQueueOptions = {}
) => {
  const { enableQueue = true, enableWorker = true } = options
  if (!connection) return null
  const connectionOptions = connection as unknown as ConnectionOptions
  if (enableQueue && !queue) {
    queue = new Queue(QUEUE_NAME, { connection: connectionOptions })
  }
  if (enableWorker && !worker) {
    worker = new Worker(QUEUE_NAME, (job) => processBullJob(job, logger), {
      connection: connectionOptions,
    })
  }
  return queue
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
    await queue.add(type, { jobId: job.id }, { jobId: job.id, attempts: 1 })
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

export const enqueueSummaryDraftJob = (
  companyId: string,
  periodStart: string,
  periodEnd: string,
  userId?: string
) => enqueueJob(JobType.summary_draft, { companyId, periodStart, periodEnd }, userId)

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
