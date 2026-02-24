import { FastifyReply, FastifyRequest } from 'fastify'
import { Job, JobStatus, Prisma } from '@prisma/client'
import { cancelJob } from '../services'
import { prisma } from '../utils'
import { JWTUser } from '../types/auth'
import type { JobListQuery } from './jobs.schemas'

const terminalStatuses = new Set<JobStatus>([
  JobStatus.completed,
  JobStatus.failed,
  JobStatus.canceled,
])

const jobNotFound = (reply: FastifyReply) => reply.code(404).send({ error: 'Job not found' })

const forbidden = (reply: FastifyReply) => reply.code(403).send({ error: 'Forbidden' })

const sanitizeJobError = (job: Job, isAdmin: boolean) => {
  if (isAdmin || !job.error || typeof job.error !== 'object') return job
  const error = job.error as { name?: unknown; message?: unknown }
  return {
    ...job,
    error: {
      name: typeof error.name === 'string' ? error.name : 'Error',
      message: typeof error.message === 'string' ? error.message : 'Unknown error',
    },
  }
}

const canAccessJob = (user: JWTUser, job: Job) => user.role === 'admin' || job.userId === user.userId

const findJobOrReply = async (jobId: string, reply: FastifyReply) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  })
  if (!job) {
    jobNotFound(reply)
    return null
  }
  return job
}

export const listJobsHandler = async (
  request: FastifyRequest<{ Querystring: JobListQuery }>
) => {
  const user = request.user as JWTUser
  const isAdmin = user.role === 'admin'
  const { type, status } = request.query

  const where: Prisma.JobWhereInput = {}
  if (!isAdmin) {
    where.userId = user.userId
  }
  if (type) {
    where.type = type
  }
  if (status) {
    where.status = status
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: request.query.limit,
  })

  return {
    jobs: jobs.map((job) => sanitizeJobError(job, isAdmin)),
  }
}

export const getJobHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser
  const job = await findJobOrReply(request.params.id, reply)
  if (!job) return reply
  if (!canAccessJob(user, job)) {
    return forbidden(reply)
  }

  return {
    job: sanitizeJobError(job, user.role === 'admin'),
  }
}

export const cancelJobHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser
  const job = await findJobOrReply(request.params.id, reply)
  if (!job) return reply
  if (!canAccessJob(user, job)) {
    return forbidden(reply)
  }
  if (terminalStatuses.has(job.status)) {
    return reply.code(400).send({ error: 'Job already finished' })
  }

  const updated = await cancelJob(request.params.id)
  if (!updated) {
    return jobNotFound(reply)
  }
  return {
    job: sanitizeJobError(updated, user.role === 'admin'),
  }
}
