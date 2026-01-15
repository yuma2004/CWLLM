import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middleware/rbac'
import { getDashboardHandler } from './dashboard.handlers'
import { dashboardResponseSchema } from './dashboard.schemas'

export async function dashboardRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get(
    '/dashboard',
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: dashboardResponseSchema,
        },
      },
    },
    getDashboardHandler
  )
}
