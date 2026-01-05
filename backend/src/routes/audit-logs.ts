import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../middleware/rbac'
import { parsePagination } from '../utils/pagination'
import { prisma, handlePrismaError } from '../utils/prisma'
import { parseDate } from '../utils/validation'

interface AuditLogListQuery {
  entityType?: string
  entityId?: string
  from?: string
  to?: string
  page?: string
  pageSize?: string
}

export async function auditLogRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: AuditLogListQuery }>(
    '/audit-logs',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const { entityType, entityId } = request.query
      const fromDate = parseDate(request.query.from)
      const toDate = parseDate(request.query.to)
      if (request.query.from && !fromDate) {
        return reply.code(400).send({ error: 'Invalid from date' })
      }
      if (request.query.to && !toDate) {
        return reply.code(400).send({ error: 'Invalid to date' })
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.AuditLogWhereInput = {}
      if (entityType) {
        where.entityType = entityType
      }
      if (entityId) {
        where.entityId = entityId
      }
      if (fromDate || toDate) {
        where.createdAt = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        }
      }

      try {
        const [items, total] = await prisma.$transaction([
          prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          prisma.auditLog.count({ where }),
        ])

        return {
          items,
          pagination: {
            page,
            pageSize,
            total,
          },
        }
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
  )
}
