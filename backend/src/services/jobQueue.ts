import { Queue, Worker, Job as BullJob } from 'bullmq'
import IORedis from 'ioredis'
import { JobStatus, JobType, Prisma } from '@prisma/client'
import { env } from '../config/env'
import { prisma } from '../utils/prisma'
import { generateSummaryDraft } from './summaryGenerator'
import { JobCanceledError, syncChatworkMessages, syncChatworkRooms } from './chatworkSync'

const QUEUE_NAME = 'cwllm-jobs'

let queue: Queue | null = null
let worker: Worker | null = null
const connection = env.redisUrl ? new IORedis(env.redisUrl) : null

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

const updateProgress = async (jobId: string, result: Prisma.JsonValue) => {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      result,
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
    let result: Prisma.JsonValue | null = null

    if (type === JobType.chatwork_rooms_sync) {
      result = await syncChatworkRooms(() => isCanceled(jobId), logger)
    } else if (type === JobType.chatwork_messages_sync) {
      const roomId = (payload as { roomId?: string } | null)?.roomId
      const rooms = await prisma.chatworkRoom.count({
        where: roomId ? { roomId } : { isActive: true },
      })
      await updateProgress(jobId, { totalRooms: rooms, processedRooms: 0 })

      let processed = 0
      const data = await syncChatworkMessages(
        roomId,
        async () => {
          const canceled = await isCanceled(jobId)
          return canceled
        },
        logger
      )
      processed = data.rooms.length + data.errors.length
      await updateProgress(jobId, { totalRooms: rooms, processedRooms: processed, summary: data })
      result = data
    } else if (type === JobType.summary_draft) {
      const typedPayload = payload as { companyId: string; periodStart: string; periodEnd: string }
      const draft = await generateSummaryDraft(
        typedPayload.companyId,
        new Date(typedPayload.periodStart),
        new Date(typedPayload.periodEnd)
      )
      result = {
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
          tokenUsage: draft.tokenUsage,
        },
      }
    } else {
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
        error: serializeError(error),
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

export const initJobQueue = (logger?: { warn: (message: string) => void }) => {
  if (!connection) return null
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection })
  }
  if (!worker) {
    worker = new Worker(QUEUE_NAME, (job) => processBullJob(job, logger), { connection })
  }
  return queue
}

export const enqueueJob = async (
  type: JobType,
  payload: Prisma.JsonValue,
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
