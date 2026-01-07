import { FastifyInstance } from 'fastify'
import { JobType, SummaryType, Prisma } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { enqueueJob } from '../services/jobQueue'
import { prisma } from '../utils/prisma'
import { isNonEmptyString, parseDate, parseStringArray } from '../utils/validation'

interface DraftBody {
  periodStart: string
  periodEnd: string
}

interface SummaryCreateBody {
  content: string
  type?: SummaryType
  periodStart: string
  periodEnd: string
  sourceLinks?: string[]
  model?: string
  promptVersion?: string
  sourceMessageCount?: number
  tokenUsage?: unknown
  draftId?: string
}

const normalizeSummaryType = (value?: string) => {
  if (value === undefined) return undefined
  if (!Object.values(SummaryType).includes(value as SummaryType)) return null
  return value as SummaryType
}

const normalizeJsonInput = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined
  return value as Prisma.InputJsonValue
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
    { preHandler: requireWriteAccess() },
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

      const cached = await prisma.summaryDraft.findFirst({
        where: {
          companyId: request.params.id,
          periodStart,
          periodEnd,
          expiresAt: { gt: new Date() },
        },
      })
      if (cached) {
        return {
          cached: true,
          draft: {
            id: cached.id,
            content: cached.content,
            periodStart: cached.periodStart.toISOString(),
            periodEnd: cached.periodEnd.toISOString(),
            sourceLinks: cached.sourceLinks,
            model: cached.model,
            promptVersion: cached.promptVersion,
            sourceMessageCount: cached.sourceMessageCount,
            tokenUsage: cached.tokenUsage,
          },
        }
      }

      const userId = (request.user as { userId?: string } | undefined)?.userId
      const job = await enqueueJob(
        JobType.summary_draft,
        {
          companyId: request.params.id,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
        },
        userId
      )

      return reply.code(202).send({ jobId: job.id, status: job.status })
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
      const sourceMessageCount =
        request.body.sourceMessageCount !== undefined
          ? Number(request.body.sourceMessageCount)
          : undefined

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
      if (sourceMessageCount !== undefined && !Number.isFinite(sourceMessageCount)) {
        return reply.code(400).send({ error: 'Invalid sourceMessageCount' })
      }

      const company = await prisma.company.findUnique({ where: { id: request.params.id } })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      let resolvedLinks = sourceLinks ?? []
      let model = request.body.model ?? null
      let promptVersion = request.body.promptVersion ?? null
      let resolvedCount = sourceMessageCount ?? null
      let tokenUsage = normalizeJsonInput(request.body.tokenUsage)

      if (request.body.draftId) {
        const draft = await prisma.summaryDraft.findUnique({
          where: { id: request.body.draftId },
        })
        if (draft && draft.companyId === request.params.id) {
          resolvedLinks = resolvedLinks.length > 0 ? resolvedLinks : draft.sourceLinks
          model = model ?? draft.model
          promptVersion = promptVersion ?? draft.promptVersion
          resolvedCount = resolvedCount ?? draft.sourceMessageCount
          tokenUsage = tokenUsage ?? normalizeJsonInput(draft.tokenUsage)
        }
      }

      const summary = await prisma.summary.create({
        data: {
          companyId: request.params.id,
          content: content.trim(),
          periodStart,
          periodEnd,
          type: type ?? 'manual',
          sourceLinks: resolvedLinks,
          model,
          promptVersion,
          sourceMessageCount: resolvedCount,
          tokenUsage,
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
