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
  const job = await prisma.job.findUnique({
    where: { id: request.params.id },
  })
  if (!job) {
    return reply.code(404).send({ error: 'Job not found' })
  }

  if (user.role !== 'admin' && job.userId !== user.userId) {
    return reply.code(403).send({ error: 'Forbidden' })
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
  const job = await prisma.job.findUnique({ where: { id: request.params.id } })
  if (!job) {
    return reply.code(404).send({ error: 'Job not found' })
  }
  if (user.role !== 'admin' && job.userId !== user.userId) {
    return reply.code(403).send({ error: 'Forbidden' })
  }
  if (terminalStatuses.has(job.status)) {
    return reply.code(400).send({ error: 'Job already finished' })
  }

  const updated = await cancelJob(request.params.id)
  if (!updated) {
    return reply.code(404).send({ error: 'Job not found' })
  }
  return {
    job: sanitizeJobError(updated, user.role === 'admin'),
  }
}
