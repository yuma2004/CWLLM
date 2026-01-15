import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/rbac'
import { listAuditLogsHandler } from './audit-logs.handlers'
import type { AuditLogListQuery } from './audit-logs.schemas'

export async function auditLogRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: AuditLogListQuery }>(
    '/audit-logs',
    { preHandler: requireAuth() },
    listAuditLogsHandler
  )
}
