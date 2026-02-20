import { FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import {
  CACHE_KEYS,
  CACHE_TTLS_MS,
  badRequest,
  buildPaginatedResponse,
  deleteCacheByPrefix,
  getCache,
  handlePrismaError,
  notFound,
  parseDate,
  parseLimit,
  parsePagination,
  prisma,
  setCache,
} from '../utils'
import {
  buildMessageSearchWhere,
  enqueueOnDemandRoomSync,
  normalizeMessageLabel,
} from '../services'
import type {
  AssignBody,
  BulkAssignBody,
  BulkLabelBody,
  LabelBody,
  LabelListQuery,
  MessageListQuery,
  MessageSearchQuery,
  UnassignedQuery,
} from './messages.schemas'

export const listCompanyMessagesHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Querystring: MessageListQuery }>,
  reply: FastifyReply
) => {
  const { from, to } = request.query
  const label = normalizeMessageLabel(request.query.label)
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

  if (page === 1) {
    const userId = (request.user as { userId?: string } | undefined)?.userId
    void enqueueOnDemandRoomSync(request.params.id, userId, request.log).catch((err) => {
      request.log.warn({ err }, 'Chatwork on-demand sync failed to enqueue')
    })
  }

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

  return buildPaginatedResponse(items, page, pageSize, total)
}

export const searchMessagesHandler = async (
  request: FastifyRequest<{ Querystring: MessageSearchQuery }>,
  reply: FastifyReply
) => {
  const { q, messageId, companyId, from, to } = request.query
  const label = normalizeMessageLabel(request.query.label)
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

  return buildPaginatedResponse(items, page, pageSize, total)
}

export const listUnassignedMessagesHandler = async (
  request: FastifyRequest<{ Querystring: UnassignedQuery }>
) => {
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

  return buildPaginatedResponse(items, page, pageSize, total)
}

export const assignCompanyHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: AssignBody }>,
  reply: FastifyReply
) => {
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

export const bulkAssignCompanyHandler = async (
  request: FastifyRequest<{ Body: BulkAssignBody }>,
  reply: FastifyReply
) => {
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

export const addMessageLabelHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: LabelBody }>,
  reply: FastifyReply
) => {
  const label = normalizeMessageLabel(request.body.label)
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
  deleteCacheByPrefix('messages:labels:')
  return { message: updated }
}

export const removeMessageLabelHandler = async (
  request: FastifyRequest<{ Params: { id: string; label: string } }>,
  reply: FastifyReply
) => {
  const label = normalizeMessageLabel(request.params.label)
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
  deleteCacheByPrefix('messages:labels:')
  return { message: updated }
}

export const bulkAddLabelsHandler = async (
  request: FastifyRequest<{ Body: BulkLabelBody }>,
  reply: FastifyReply
) => {
  const label = normalizeMessageLabel(request.body.label)
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
  deleteCacheByPrefix('messages:labels:')

  return { updated: updates.length }
}

export const bulkRemoveLabelsHandler = async (
  request: FastifyRequest<{ Body: BulkLabelBody }>,
  reply: FastifyReply
) => {
  const label = normalizeMessageLabel(request.body.label)
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
  deleteCacheByPrefix('messages:labels:')

  return { updated: updates.length }
}

export const listMessageLabelsHandler = async (
  request: FastifyRequest<{ Querystring: LabelListQuery }>
) => {
  const limit = parseLimit(request.query.limit)

  const cacheKey = CACHE_KEYS.messageLabels(limit)
  const cached = getCache<{ items: Array<{ label: string; count: number }> }>(cacheKey)
  if (cached) {
    return cached
  }

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
  setCache(cacheKey, response, CACHE_TTLS_MS.messageLabels)

  return response
}
