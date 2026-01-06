import { FastifyInstance } from 'fastify'
import { JobStatus, JobType, Prisma } from '@prisma/client'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth } from '../middleware/rbac'
import { prisma } from '../utils/prisma'
import { JWTUser } from '../types/auth'
import { cancelJob } from '../services/jobQueue'

interface JobListQuery {
  type?: string
  status?: string
  limit?: string
}

const dateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string()
)

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
  limit: z.string().optional(),
})

const jobParamsSchema = z.object({ id: z.string().min(1) })

const jobListResponseSchema = z
  .object({
    jobs: z.array(jobSchema),
  })
  .passthrough()
const jobResponseSchema = z.object({ job: jobSchema }).passthrough()

const parseLimit = (value?: string) => {
  const limitValue = Number(value)
  if (!Number.isFinite(limitValue)) return 20
  return Math.min(Math.max(Math.floor(limitValue), 1), 100)
}

const normalizeJobType = (value?: string) => {
  if (value === undefined) return undefined
  if (!Object.values(JobType).includes(value as JobType)) return null
  return value as JobType
}

const normalizeJobStatus = (value?: string) => {
  if (value === undefined) return undefined
  if (!Object.values(JobStatus).includes(value as JobStatus)) return null
  return value as JobStatus
}

const terminalStatuses = new Set<JobStatus>([JobStatus.completed, JobStatus.failed])

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
    async (request, reply) => {
      const user = request.user as JWTUser
      const isAdmin = user.role === 'admin'
      const type = normalizeJobType(request.query.type)
      if (request.query.type !== undefined && type === null) {
        return reply.code(400).send({ error: 'Invalid type' })
      }
      const status = normalizeJobStatus(request.query.status)
      if (request.query.status !== undefined && status === null) {
        return reply.code(400).send({ error: 'Invalid status' })
      }

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

      const limit = parseLimit(request.query.limit)
      const jobs = await prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return { jobs }
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

      return { job }
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
      return { job: updated }
    }
  )
}
