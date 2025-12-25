import { FastifyInstance, FastifyReply } from 'fastify'
import { Prisma, PrismaClient } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'

const prisma = new PrismaClient()

interface MessageListQuery {
  page?: string
  pageSize?: string
  from?: string
  to?: string
  label?: string
}

interface MessageSearchQuery {
  q?: string
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

const MAX_LABEL_LENGTH = 30

const parseDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const normalizeLabel = (value?: string) => {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > MAX_LABEL_LENGTH) return null
  if (/[\r\n\t]/.test(trimmed)) return null
  return trimmed
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

export async function messageRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string }; Querystring: MessageListQuery }>(
    '/companies/:id/messages',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const { from, to } = request.query
      const label = normalizeLabel(request.query.label)
      if (request.query.label !== undefined && label === null) {
        return reply.code(400).send({ error: 'Invalid label' })
      }

      const fromDate = parseDate(from)
      const toDate = parseDate(to)
      if (from && !fromDate) {
        return reply.code(400).send({ error: 'Invalid from date' })
      }
      if (to && !toDate) {
        return reply.code(400).send({ error: 'Invalid to date' })
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
      const { q, companyId, from, to } = request.query
      const label = normalizeLabel(request.query.label)
      if (request.query.label !== undefined && label === null) {
        return reply.code(400).send({ error: 'Invalid label' })
      }
      if (!q || q.trim() === '') {
        return reply.code(400).send({ error: 'q is required' })
      }

      const fromDate = parseDate(from)
      const toDate = parseDate(to)
      if (from && !fromDate) {
        return reply.code(400).send({ error: 'Invalid from date' })
      }
      if (to && !toDate) {
        return reply.code(400).send({ error: 'Invalid to date' })
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.MessageWhereInput = {
        body: { contains: q, mode: 'insensitive' },
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
        return reply.code(400).send({ error: 'companyId is required' })
      }

      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
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

  fastify.post<{ Params: { id: string }; Body: LabelBody }>(
    '/messages/:id/labels',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const label = normalizeLabel(request.body.label)
      if (!label) {
        return reply.code(400).send({ error: 'Invalid label' })
      }

      const message = await prisma.message.findUnique({
        where: { id: request.params.id },
      })
      if (!message) {
        return reply.code(404).send({ error: 'Not found' })
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
        return reply.code(400).send({ error: 'Invalid label' })
      }

      const message = await prisma.message.findUnique({
        where: { id: request.params.id },
      })
      if (!message) {
        return reply.code(404).send({ error: 'Not found' })
      }

      const nextLabels = (message.labels ?? []).filter((item) => item !== label)
      const updated = await prisma.message.update({
        where: { id: request.params.id },
        data: { labels: nextLabels },
      })
      return { message: updated }
    }
  )
}
