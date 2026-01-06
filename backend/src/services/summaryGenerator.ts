import { prisma } from '../utils/prisma'
import { createLLMClient } from './llm'

const MAX_MESSAGES = 300
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7

const buildEmptySummary = () =>
  [
    '## Summary',
    '- No messages found for this period.',
    '',
    '## Key Topics',
    '- No topics detected.',
    '',
    '## Open Items',
    '- No open items.',
    '',
    '## Next Actions',
    '- No action items.',
  ].join('\n')

export const generateSummaryDraft = async (
  companyId: string,
  periodStart: Date,
  periodEnd: Date
) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) {
    throw new Error('Company not found')
  }

  const messages = await prisma.message.findMany({
    where: {
      companyId,
      sentAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    orderBy: { sentAt: 'asc' },
    take: MAX_MESSAGES,
  })

  let content = buildEmptySummary()
  let sourceLinks: string[] = []
  let model: string | null = null
  let promptVersion: string | null = null
  let sourceMessageCount = messages.length
  let tokenUsage: unknown = null

  if (messages.length > 0) {
    const client = createLLMClient()
    const result = await client.summarize(
      messages.map((message) => ({
        id: message.messageId,
        sender: message.sender,
        body: message.body,
        sentAt: message.sentAt.toISOString(),
      }))
    )

    content = result.content
    sourceLinks = result.sourceLinks
    model = result.metadata?.model ?? null
    promptVersion = result.metadata?.promptVersion ?? null
    sourceMessageCount = result.metadata?.sourceMessageCount ?? messages.length
    tokenUsage = result.metadata?.tokenUsage ?? null
  }

  const expiresAt = new Date(Date.now() + DRAFT_TTL_MS)

  const draft = await prisma.summaryDraft.upsert({
    where: {
      companyId_periodStart_periodEnd: {
        companyId,
        periodStart,
        periodEnd,
      },
    },
    update: {
      content,
      sourceLinks,
      model,
      promptVersion,
      sourceMessageCount,
      tokenUsage,
      expiresAt,
    },
    create: {
      companyId,
      periodStart,
      periodEnd,
      content,
      sourceLinks,
      model,
      promptVersion,
      sourceMessageCount,
      tokenUsage,
      expiresAt,
    },
  })

  return draft
}
