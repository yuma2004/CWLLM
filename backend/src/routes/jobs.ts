import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middleware/rbac'
import { cancelJobHandler, getJobHandler, listJobsHandler } from './jobs.handlers'
import {
  JobListQuery,
  jobListQuerySchema,
  jobListResponseSchema,
  jobParamsSchema,
  jobResponseSchema,
} from './jobs.schemas'

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
    listJobsHandler
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
    getJobHandler
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
    cancelJobHandler
  )
}
