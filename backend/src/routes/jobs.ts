import { FastifyInstance } from 'fastify'
import { JobStatus, JobType, Prisma, Job } from '@prisma/client'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth } from '../middleware/rbac'
import { prisma } from '../utils/prisma'
import { JWTUser } from '../types/auth'
import { cancelJob } from '../services/jobQueue'
import { dateSchema } from './shared/schemas'

interface JobListQuery {
  type?: JobType
  status?: JobStatus
  limit: number
}

const jobSchema = z
  .object({
    id: z.string(),
    type: z.nativeEnum(JobType),
    status: z.nativeEnum(JobStatus),
    payload: z.unknown(),
    result: z.unknown().nullable().optional(),
    error: z.unknown().nullable().optional(),
    userId: z.string().nullable().optional(),
    startedAt: dateSchema.nullable().optional(),
    finishedAt: dateSchema.nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

const jobListQuerySchema = z.object({
  type: z.nativeEnum(JobType).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const jobParamsSchema = z.object({ id: z.string().min(1) })

const jobListResponseSchema = z
  .object({
    jobs: z.array(jobSchema),
  })
  .passthrough()
const jobResponseSchema = z.object({ job: jobSchema }).passthrough()

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

export async function jobRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: JobListQuery }>(
    '/jobs',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Jobs'],
        querystring: jobListQuerySchema,
        response: {
          200: jobListResponseSchema,
        },
      },
    },
    async (request) => {
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
  )

  app.get<{ Params: { id: string } }>(
    '/jobs/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Jobs'],
        params: jobParamsSchema,
        response: {
          200: jobResponseSchema,
        },
      },
    },
    async (request, reply) => {
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
  )

  app.post<{ Params: { id: string } }>(
    '/jobs/:id/cancel',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Jobs'],
        params: jobParamsSchema,
        response: {
          200: jobResponseSchema,
        },
      },
    },
    async (request, reply) => {
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
  )
}
