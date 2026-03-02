import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  createSummaryHandler,
  listSummariesHandler,
  listSummaryCandidatesHandler,
} from './summaries.handlers'
import {
  SummaryCreateBody,
  summaryCandidatesResponseSchema,
  summaryCompanyParamsSchema,
  summaryCreateBodySchema,
  summaryParamsSchema,
  summaryResponseSchema,
  summariesResponseSchema,
} from './summaries.schemas'

export async function summaryRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post<{ Params: { id: string }; Body: SummaryCreateBody }>(
    '/companies/:id/summaries',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: summaryCompanyParamsSchema,
        body: summaryCreateBodySchema,
        response: {
          201: summaryResponseSchema,
        },
      },
    },
    createSummaryHandler
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id/summaries',
    {
      preHandler: requireAuth(),
      schema: {
        params: summaryCompanyParamsSchema,
        response: {
          200: summariesResponseSchema,
        },
      },
    },
    listSummariesHandler
  )

  app.post<{ Params: { id: string } }>(
    '/summaries/:id/tasks/candidates',
    {
      preHandler: requireAuth(),
      schema: {
        params: summaryParamsSchema,
        response: {
          200: summaryCandidatesResponseSchema,
        },
      },
    },
    listSummaryCandidatesHandler
  )
}
