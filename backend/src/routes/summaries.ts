import { FastifyInstance } from 'fastify'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  createSummaryHandler,
  listSummariesHandler,
  listSummaryCandidatesHandler,
} from './summaries.handlers'
import { SummaryCreateBody } from './summaries.schemas'

export async function summaryRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { id: string }; Body: SummaryCreateBody }>(
    '/companies/:id/summaries',
    { preHandler: requireWriteAccess() },
    createSummaryHandler
  )

  fastify.get<{ Params: { id: string } }>(
    '/companies/:id/summaries',
    { preHandler: requireAuth() },
    listSummariesHandler
  )

  fastify.post<{ Params: { id: string } }>(
    '/summaries/:id/tasks/candidates',
    { preHandler: requireAuth() },
    listSummaryCandidatesHandler
  )
}
