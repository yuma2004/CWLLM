import { FastifyReply, FastifyRequest } from 'fastify'
import { SummaryType } from '@prisma/client'
import { isNonEmptyString, parseDate, parseStringArray, prisma } from '../utils'
import type { SummaryCreateBody } from './summaries.schemas'

const normalizeSummaryType = (value?: string) => {
  if (value === undefined) return undefined
  if (value !== SummaryType.manual) return null
  return SummaryType.manual
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

export const createSummaryHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: SummaryCreateBody }>,
  reply: FastifyReply
) => {
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
      type: type ?? SummaryType.manual,
      sourceLinks: sourceLinks ?? [],
    },
  })

  return reply.code(201).send({ summary })
}

export const listSummariesHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
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

export const listSummaryCandidatesHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
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
