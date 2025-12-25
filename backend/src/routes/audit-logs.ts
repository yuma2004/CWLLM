import { FastifyInstance, FastifyReply } from 'fastify'
import { Prisma, PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/rbac'

const prisma = new PrismaClient()

const parseDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const parsePagination = (pageValue?: string, pageSizeValue?: string) => {
  const page = Math.max(Number(pageValue) || 1, 1)
  const pageSize = Math.min(Math.max(Number(pageSizeValue) || 20, 1), 100)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const handlePrismaError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return reply.code(404).send({ error: 'Not found' })
    }
  }
  return reply.code(500).send({ error: 'Internal server error' })
}

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
