import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { badRequest, notFound } from '../utils/errors'
import { parsePagination } from '../utils/pagination'
import { handlePrismaError, prisma } from '../utils/prisma'
import { getCache, setCache } from '../utils/ttlCache'
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
const LABEL_CACHE_TTL_MS = 30_000

const dateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string()
)
const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

const messageSchema = z
  .object({
    id: z.string(),
    chatworkRoomId: z.string().optional(),
    roomId: z.string(),
    messageId: z.string(),
    sender: z.string(),
    body: z.string(),
    sentAt: dateSchema.optional(),
    labels: z.array(z.string()).optional(),
    companyId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    wholesaleId: z.string().nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

const messageListQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  label: z.string().optional(),
})

const messageSearchQuerySchema = z.object({
  q: z.string().optional(),
  messageId: z.string().optional(),
  companyId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  label: z.string().optional(),
})

const messageUnassignedQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

const messageAssignBodySchema = z.object({
  companyId: z.string().min(1),
})

const messageLabelBodySchema = z.object({
  label: z.string().min(1),
})

const messageBulkAssignBodySchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  companyId: z.string().min(1),
})

const messageBulkLabelBodySchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  label: z.string().min(1),
})

const messageLabelListQuerySchema = z.object({
  limit: z.string().optional(),
})

const messageParamsSchema = z.object({ id: z.string().min(1) })
const messageLabelParamsSchema = z.object({ id: z.string().min(1), label: z.string() })

const messageListResponseSchema = z
  .object({
    items: z.array(messageSchema),
    pagination: paginationSchema,
  })
  .passthrough()

const messageResponseSchema = z.object({ message: messageSchema }).passthrough()
const messageBulkResponseSchema = z.object({ updated: z.number() }).passthrough()

const messageLabelListResponseSchema = z
  .object({
    items: z.array(
      z
        .object({
          label: z.string(),
          count: z.number(),
        })
        .passthrough()
    ),
  })
  .passthrough()

const normalizeLabel = (value?: string) => {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > MAX_LABEL_LENGTH) return null
  if (/[\r\n\t]/.test(trimmed)) return null
  return trimmed
}

type MessageSearchFilters = {
  query?: string
  messageId?: string
  companyId?: string | null
  label?: string
  fromDate?: Date
  toDate?: Date
}

const buildMessageSearchWhere = (filters: MessageSearchFilters) => {
  const conditions: Prisma.Sql[] = []
  if (filters.query) {
    conditions.push(
      Prisma.sql`to_tsvector('simple', "body") @@ plainto_tsquery('simple', ${filters.query})`
    )
  }
  if (filters.messageId) {
    conditions.push(Prisma.sql`"messageId" = ${filters.messageId}`)
  }
  if (filters.companyId !== undefined) {
    if (filters.companyId === null) {
      conditions.push(Prisma.sql`"companyId" IS NULL`)
    } else {
      conditions.push(Prisma.sql`"companyId" = ${filters.companyId}`)
    }
  }
  if (filters.label) {
    conditions.push(Prisma.sql`"labels" @> ARRAY[${filters.label}]::text[]`)
  }
  if (filters.fromDate) {
    conditions.push(Prisma.sql`"sentAt" >= ${filters.fromDate}`)
  }
  if (filters.toDate) {
    conditions.push(Prisma.sql`"sentAt" <= ${filters.toDate}`)
  }
  if (conditions.length === 0) {
    return Prisma.sql``
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
}

export async function messageRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Params: { id: string }; Querystring: MessageListQuery }>(
    '/companies/:id/messages',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        params: messageParamsSchema,
        querystring: messageListQuerySchema,
        response: {
          200: messageListResponseSchema,
        },
      },
    },
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

  app.get<{ Querystring: MessageSearchQuery }>(
    '/messages/search',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        querystring: messageSearchQuerySchema,
        response: {
          200: messageListResponseSchema,
        },
      },
    },
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

      const whereSql = buildMessageSearchWhere({
        query: trimmedQuery || undefined,
        messageId,
        companyId: companyId ?? undefined,
        label: label ?? undefined,
        fromDate: fromDate ?? undefined,
        toDate: toDate ?? undefined,
      })

      const [items, countRows] = await prisma.$transaction([
        prisma.$queryRaw<
          Array<{
            id: string
            roomId: string
            messageId: string
            sender: string
            body: string
            sentAt: Date
            companyId: string | null
            labels: string[]
          }>
        >(
          Prisma.sql`SELECT "id", "roomId", "messageId", "sender", "body", "sentAt", "companyId", "labels"
            FROM "messages"
            ${whereSql}
            ORDER BY "sentAt" DESC
            LIMIT ${pageSize} OFFSET ${skip}`
        ),
        prisma.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`SELECT COUNT(*)::bigint as count FROM "messages" ${whereSql}`
        ),
      ])

      const total = Number(countRows[0]?.count ?? 0)

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

  app.get<{ Querystring: UnassignedQuery }>(
    '/messages/unassigned',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        querystring: messageUnassignedQuerySchema,
        response: {
          200: messageListResponseSchema,
        },
      },
    },
    async (request) => {
      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const trimmedQuery = request.query.q?.trim()
      const whereSql = buildMessageSearchWhere({
        query: trimmedQuery || undefined,
        companyId: null,
      })

      const [items, countRows] = await prisma.$transaction([
        prisma.$queryRaw<Array<Record<string, unknown>>>(
          Prisma.sql`SELECT *
            FROM "messages"
            ${whereSql}
            ORDER BY "sentAt" DESC
            LIMIT ${pageSize} OFFSET ${skip}`
        ),
        prisma.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`SELECT COUNT(*)::bigint as count FROM "messages" ${whereSql}`
        ),
      ])

      const total = Number(countRows[0]?.count ?? 0)

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

  app.patch<{ Params: { id: string }; Body: AssignBody }>(
    '/messages/:id/assign-company',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        params: messageParamsSchema,
        body: messageAssignBodySchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
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

  app.patch<{ Body: BulkAssignBody }>(
    '/messages/assign-company',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        body: messageBulkAssignBodySchema,
        response: {
          200: messageBulkResponseSchema,
        },
      },
    },
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

  app.post<{ Params: { id: string }; Body: LabelBody }>(
    '/messages/:id/labels',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        params: messageParamsSchema,
        body: messageLabelBodySchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
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

  app.delete<{ Params: { id: string; label: string } }>(
    '/messages/:id/labels/:label',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        params: messageLabelParamsSchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
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

  app.post<{ Body: BulkLabelBody }>(
    '/messages/labels/bulk',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        body: messageBulkLabelBodySchema,
        response: {
          200: messageBulkResponseSchema,
        },
      },
    },
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

  app.post<{ Body: BulkLabelBody }>(
    '/messages/labels/bulk/remove',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        body: messageBulkLabelBodySchema,
        response: {
          200: messageBulkResponseSchema,
        },
      },
    },
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

  app.get<{ Querystring: LabelListQuery }>(
    '/messages/labels',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        querystring: messageLabelListQuerySchema,
        response: {
          200: messageLabelListResponseSchema,
        },
      },
    },
    async (request) => {
      const limitValue = Number(request.query.limit)
      const limit = Number.isFinite(limitValue)
        ? Math.min(Math.max(Math.floor(limitValue), 1), 50)
        : 20

      const cacheKey = `messages:labels:${limit}`
      const cached = getCache<{ items: Array<{ label: string; count: number }> }>(cacheKey)
      if (cached) {
        return cached
      }

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

      const response = { items }
      setCache(cacheKey, response, LABEL_CACHE_TTL_MS)

      return response
    }
  )
}
