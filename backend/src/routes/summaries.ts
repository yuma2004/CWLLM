import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { createLLMClient } from '../services/llm'

const prisma = new PrismaClient()

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const parseDate = (value?: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const parseStringArray = (value: unknown): string[] | null | undefined => {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return null
  if (value.some((item) => typeof item !== 'string')) return null
  return value
}

const MAX_MESSAGES = 200

interface DraftBody {
  periodStart: string
  periodEnd: string
}

interface SummaryCreateBody {
  content: string
  type?: string
  periodStart: string
  periodEnd: string
  sourceLinks?: string[]
}

const normalizeSummaryType = (value?: string) => {
  if (value === undefined) return undefined
  if (value !== 'manual' && value !== 'auto') return null
  return value
}

const extractCandidates = (content: string) => {
  const lines = content.split(/\r?\n/)
  const candidates: Array<{ title: string; dueDate?: string }> = []
  let inActions = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      const heading = trimmed.replace('## ', '').toLowerCase()
      inActions = heading.includes('next action') || heading.includes('open item')
      continue
    }
    if (!inActions) continue
    if (!trimmed.startsWith('- ')) continue

    const text = trimmed.replace(/^-\s+/, '')
    if (!text) continue

    const match = text.match(/(\d{4}-\d{2}-\d{2})/)
    candidates.push({
      title: text,
      dueDate: match ? match[1] : undefined,
    })
  }

  return candidates
}

export async function summaryRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { id: string }; Body: DraftBody }>(
    '/companies/:id/summaries/draft',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const periodStart = parseDate(request.body.periodStart)
      const periodEnd = parseDate(request.body.periodEnd)
      if (!periodStart || !periodEnd) {
        return reply.code(400).send({ error: 'Invalid period' })
      }
      if (periodStart > periodEnd) {
        return reply.code(400).send({ error: 'Invalid period range' })
      }

      const company = await prisma.company.findUnique({ where: { id: request.params.id } })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      const messages = await prisma.message.findMany({
        where: {
          companyId: request.params.id,
          sentAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: { sentAt: 'desc' },
        take: MAX_MESSAGES,
      })

      const client = createLLMClient()
      const draft = await client.summarize(
        messages.map((message) => ({
          id: message.messageId,
          sender: message.sender,
          body: message.body,
          sentAt: message.sentAt.toISOString(),
        }))
      )

      return {
        draft: {
          content: draft.content,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          sourceLinks: draft.sourceLinks,
        },
      }
    }
  )

  fastify.post<{ Params: { id: string }; Body: SummaryCreateBody }>(
    '/companies/:id/summaries',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { content } = request.body
      const periodStart = parseDate(request.body.periodStart)
      const periodEnd = parseDate(request.body.periodEnd)
      const type = normalizeSummaryType(request.body.type)
      const sourceLinks = parseStringArray(request.body.sourceLinks)

      if (!isNonEmptyString(content)) {
        return reply.code(400).send({ error: 'content is required' })
      }
      if (!periodStart || !periodEnd) {
        return reply.code(400).send({ error: 'Invalid period' })
      }
      if (periodStart > periodEnd) {
        return reply.code(400).send({ error: 'Invalid period range' })
      }
      if (request.body.type !== undefined && type === null) {
        return reply.code(400).send({ error: 'Invalid summary type' })
      }
      if (sourceLinks === null) {
        return reply.code(400).send({ error: 'sourceLinks must be string array' })
      }

      const company = await prisma.company.findUnique({ where: { id: request.params.id } })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      const summary = await prisma.summary.create({
        data: {
          companyId: request.params.id,
          content: content.trim(),
          periodStart,
          periodEnd,
          type: type ?? 'manual',
          sourceLinks: sourceLinks ?? [],
        },
      })

      return reply.code(201).send({ summary })
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/companies/:id/summaries',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const company = await prisma.company.findUnique({ where: { id: request.params.id } })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      const summaries = await prisma.summary.findMany({
        where: { companyId: request.params.id },
        orderBy: { createdAt: 'desc' },
      })

      return { summaries }
    }
  )

  fastify.post<{ Params: { id: string } }>(
    '/summaries/:id/tasks/candidates',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const summary = await prisma.summary.findUnique({ where: { id: request.params.id } })
      if (!summary) {
        return reply.code(404).send({ error: 'Summary not found' })
      }

      const candidates = extractCandidates(summary.content).map((candidate) => ({
        title: candidate.title,
        dueDate: candidate.dueDate,
      }))

      return { candidates }
    }
  )
}
