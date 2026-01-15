import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middleware/rbac'
import { searchHandler } from './search.handlers'
import { SearchQuery, searchQuerySchema } from './search.schemas'

export async function searchRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get<{ Querystring: SearchQuery }>(
    '/search',
    {
      preHandler: requireAuth(),
      schema: {
        querystring: searchQuerySchema,
      },
    },
    searchHandler
  )
}
