import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAdmin } from '../middleware/rbac'
import { exportCompaniesHandler, exportTasksHandler } from './export.handlers'
import {
  CompanyExportQuery,
  TaskExportQuery,
  companyExportQuerySchema,
  taskExportQuerySchema,
} from './export.schemas'

export async function exportRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get<{ Querystring: CompanyExportQuery }>(
    '/export/companies.csv',
    {
      preHandler: requireAdmin(),
      schema: {
        querystring: companyExportQuerySchema,
      },
    },
    exportCompaniesHandler
  )

  app.get<{ Querystring: TaskExportQuery }>(
    '/export/tasks.csv',
    {
      preHandler: requireAdmin(),
      schema: {
        querystring: taskExportQuerySchema,
      },
    },
    exportTasksHandler
  )
}
