import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { badRequest, notFound } from '../utils/errors'
import { parsePagination } from '../utils/pagination'
import { handlePrismaError, prisma } from '../utils/prisma'
import { parseDate } from '../utils/validation'

interface MessageListQuery {
  page?: string
  pageSize?: string
  from?: string
  to?: string
  label?: string
}

interface MessageSearchQuery {
  q?: string
  messageId?: string
  companyId?: string
  page?: string
  pageSize?: string
  from?: string
  to?: string
  label?: string
}

interface UnassignedQuery {
  q?: string
  page?: string
  pageSize?: string
}

interface AssignBody {
  companyId: string
}

interface LabelBody {
  label: string
}

interface LabelListQuery {
  limit?: string
}

interface BulkAssignBody {
  messageIds: string[]
  companyId: string
}

interface BulkLabelBody {
  messageIds: string[]
  label: string
}

const MAX_LABEL_LENGTH = 30

const normalizeLabel = (value?: string) => {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > MAX_LABEL_LENGTH) return null
  if (/[\r\n\t]/.test(trimmed)) return null
  return trimmed
}

export async function messageRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string }; Querystring: MessageListQuery }>(
    '/companies/:id/messages',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const { from, to } = request.query
      const label = normalizeLabel(request.query.label)
      if (request.query.label !== undefined && label === null) {
        return reply.code(400).send(badRequest('Invalid label'))
      }

      const fromDate = parseDate(from)
      const toDate = parseDate(to)
      if (from && !fromDate) {
        return reply.code(400).send(badRequest('Invalid from date'))
      }
      if (to && !toDate) {
        return reply.code(400).send(badRequest('Invalid to date'))
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.MessageWhereInput = {
        companyId: request.params.id,
      }
      if (label) {
        where.labels = { has: label }
      }
      if (fromDate || toDate) {
        where.sentAt = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        }
      }

      const [items, total] = await prisma.$transaction([
        prisma.message.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.message.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.get<{ Querystring: MessageSearchQuery }>(
    '/messages/search',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const { q, messageId, companyId, from, to } = request.query
      const label = normalizeLabel(request.query.label)
      if (request.query.label !== undefined && label === null) {
        return reply.code(400).send(badRequest('Invalid label'))
      }
      const trimmedQuery = q?.trim()
      if ((!trimmedQuery || trimmedQuery === '') && !messageId) {
        return reply.code(400).send(badRequest('q or messageId is required'))
      }

      const fromDate = parseDate(from)
      const toDate = parseDate(to)
      if (from && !fromDate) {
        return reply.code(400).send(badRequest('Invalid from date'))
      }
      if (to && !toDate) {
        return reply.code(400).send(badRequest('Invalid to date'))
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.MessageWhereInput = {}
      if (trimmedQuery) {
        where.body = { contains: trimmedQuery, mode: 'insensitive' }
      }
      if (messageId) {
        where.messageId = messageId
      }
      if (companyId) {
        where.companyId = companyId
      }
      if (label) {
        where.labels = { has: label }
      }
      if (fromDate || toDate) {
        where.sentAt = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        }
      }

      const [items, total] = await prisma.$transaction([
        prisma.message.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip,
          take: pageSize,
          select: {
            id: true,
            roomId: true,
            messageId: true,
            sender: true,
            body: true,
            sentAt: true,
            companyId: true,
            labels: true,
          },
        }),
        prisma.message.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.get<{ Querystring: UnassignedQuery }>(
    '/messages/unassigned',
    { preHandler: requireAuth() },
    async (request) => {
      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.MessageWhereInput = {
        companyId: null,
      }
      if (request.query.q) {
        where.body = { contains: request.query.q, mode: 'insensitive' }
      }

      const [items, total] = await prisma.$transaction([
        prisma.message.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.message.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.patch<{ Params: { id: string }; Body: AssignBody }>(
    '/messages/:id/assign-company',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { companyId } = request.body
      if (!companyId || companyId.trim() === '') {
        return reply.code(400).send(badRequest('companyId is required'))
      }

      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        return reply.code(404).send(notFound('Company'))
      }

      try {
        const message = await prisma.message.update({
          where: { id: request.params.id },
          data: { companyId },
        })
        return { message }
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
  )

  fastify.patch<{ Body: BulkAssignBody }>(
    '/messages/assign-company',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { companyId, messageIds } = request.body
      if (!companyId || companyId.trim() === '') {
        return reply.code(400).send(badRequest('companyId is required'))
      }
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return reply.code(400).send(badRequest('messageIds is required'))
      }

      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        return reply.code(404).send(notFound('Company'))
      }

      const result = await prisma.message.updateMany({
        where: { id: { in: messageIds } },
        data: { companyId },
      })

      return { updated: result.count }
    }
  )

  fastify.post<{ Params: { id: string }; Body: LabelBody }>(
    '/messages/:id/labels',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const label = normalizeLabel(request.body.label)
      if (!label) {
        return reply.code(400).send(badRequest('Invalid label'))
      }

      const message = await prisma.message.findUnique({
        where: { id: request.params.id },
      })
      if (!message) {
        return reply.code(404).send(notFound('Message'))
      }

      const nextLabels = Array.from(new Set([...(message.labels ?? []), label]))
      const updated = await prisma.message.update({
        where: { id: request.params.id },
        data: { labels: nextLabels },
      })
      return { message: updated }
    }
  )

  fastify.delete<{ Params: { id: string; label: string } }>(
    '/messages/:id/labels/:label',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const label = normalizeLabel(request.params.label)
      if (!label) {
        return reply.code(400).send(badRequest('Invalid label'))
      }

      const message = await prisma.message.findUnique({
        where: { id: request.params.id },
      })
      if (!message) {
        return reply.code(404).send(notFound('Message'))
      }

      const nextLabels = (message.labels ?? []).filter((item) => item !== label)
      const updated = await prisma.message.update({
        where: { id: request.params.id },
        data: { labels: nextLabels },
      })
      return { message: updated }
    }
  )

  fastify.post<{ Body: BulkLabelBody }>(
    '/messages/labels/bulk',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const label = normalizeLabel(request.body.label)
      if (!label) {
        return reply.code(400).send(badRequest('Invalid label'))
      }
      if (!Array.isArray(request.body.messageIds) || request.body.messageIds.length === 0) {
        return reply.code(400).send(badRequest('messageIds is required'))
      }

      const messages = await prisma.message.findMany({
        where: { id: { in: request.body.messageIds } },
      })

      const updates = messages.map((message) => {
        const nextLabels = Array.from(new Set([...(message.labels ?? []), label]))
        return prisma.message.update({
          where: { id: message.id },
          data: { labels: nextLabels },
        })
      })

      await prisma.$transaction(updates)

      return { updated: updates.length }
    }
  )

  fastify.post<{ Body: BulkLabelBody }>(
    '/messages/labels/bulk/remove',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const label = normalizeLabel(request.body.label)
      if (!label) {
        return reply.code(400).send(badRequest('Invalid label'))
      }
      if (!Array.isArray(request.body.messageIds) || request.body.messageIds.length === 0) {
        return reply.code(400).send(badRequest('messageIds is required'))
      }

      const messages = await prisma.message.findMany({
        where: { id: { in: request.body.messageIds } },
      })

      const updates = messages.map((message) => {
        const nextLabels = (message.labels ?? []).filter((item) => item !== label)
        return prisma.message.update({
          where: { id: message.id },
          data: { labels: nextLabels },
        })
      })

      await prisma.$transaction(updates)

      return { updated: updates.length }
    }
  )

  fastify.get<{ Querystring: LabelListQuery }>(
    '/messages/labels',
    { preHandler: requireAuth() },
    async (request) => {
      const limitValue = Number(request.query.limit)
      const limit = Number.isFinite(limitValue)
        ? Math.min(Math.max(Math.floor(limitValue), 1), 50)
        : 20

      // 最適化: PostgreSQLのunnestとGROUP BYを使用してDB側で集計
      const labelCounts = await prisma.$queryRaw<{ label: string; count: bigint }[]>`
        SELECT unnest(labels) as label, COUNT(*) as count
        FROM messages
        WHERE array_length(labels, 1) > 0
        GROUP BY unnest(labels)
        ORDER BY count DESC
        LIMIT ${limit}
      `

      const items = labelCounts.map((row) => ({
        label: row.label,
        count: Number(row.count),
      }))

      return { items }
    }
  )
}
