import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAdmin } from '../middleware/rbac'
import { getSettingsHandler, updateSettingsHandler } from './settings.handlers'
import {
  SettingsUpdateBody,
  settingsResponseSchema,
  settingsUpdateBodySchema,
} from './settings.schemas'

export async function settingRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get(
    '/settings',
    {
      preHandler: requireAdmin(),
      schema: {
        response: {
          200: settingsResponseSchema,
        },
      },
    },
    getSettingsHandler
  )

  app.patch<{ Body: SettingsUpdateBody }>(
    '/settings',
    {
      preHandler: requireAdmin(),
      schema: {
        body: settingsUpdateBodySchema,
        response: {
          200: settingsResponseSchema,
        },
      },
    },
    updateSettingsHandler
  )
}
