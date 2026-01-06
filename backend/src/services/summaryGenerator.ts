import { Prisma, type Message } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { createLLMClient } from './llm'

const MAX_MESSAGES = 300
const RECENT_MESSAGE_RATIO = 0.6
const SAMPLE_BUCKETS = 8
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

const selectMessagesForSummary = async (
  companyId: string,
  periodStart: Date,
  periodEnd: Date
) => {
  const where = {
    companyId,
    sentAt: {
      gte: periodStart,
      lte: periodEnd,
    },
  }

  const totalCount = await prisma.message.count({ where })
  if (totalCount === 0) {
    return { messages: [] as Message[], totalCount }
  }

  if (totalCount <= MAX_MESSAGES) {
    const messages = await prisma.message.findMany({
      where,
      orderBy: { sentAt: 'asc' },
    })
    return { messages, totalCount }
  }

  const targetRecentCount = Math.max(Math.floor(MAX_MESSAGES * RECENT_MESSAGE_RATIO), 1)
  const recentMessages = await prisma.message.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: targetRecentCount,
  })

  const remaining = Math.max(MAX_MESSAGES - recentMessages.length, 0)
  let sampledOlder: Message[] = []
  const oldestRecent = recentMessages[recentMessages.length - 1]?.sentAt

  if (remaining > 0 && oldestRecent) {
    const olderWhere = {
      companyId,
      sentAt: {
        gte: periodStart,
        lt: oldestRecent,
      },
    }
    const olderCount = await prisma.message.count({ where: olderWhere })

    if (olderCount > 0) {
      if (olderCount <= remaining) {
        sampledOlder = await prisma.message.findMany({
          where: olderWhere,
          orderBy: { sentAt: 'asc' },
        })
      } else {
        const bucketCount = Math.min(SAMPLE_BUCKETS, remaining, olderCount)
        const perBucket = Math.ceil(remaining / bucketCount)
        const buckets = await Promise.all(
          Array.from({ length: bucketCount }, (_, index) => {
            const skip = Math.floor((index * olderCount) / bucketCount)
            const take = Math.min(perBucket, olderCount - skip)
            if (take <= 0) return Promise.resolve([] as Message[])
            return prisma.message.findMany({
              where: olderWhere,
              orderBy: { sentAt: 'asc' },
              skip,
              take,
            })
          })
        )
        sampledOlder = buckets.flat()
      }
    }
  }

  const messageMap = new Map<string, Message>()
  for (const message of [...sampledOlder, ...recentMessages]) {
    messageMap.set(message.id, message)
  }

  const messages = Array.from(messageMap.values()).sort(
    (a, b) => a.sentAt.getTime() - b.sentAt.getTime()
  )

  return {
    messages: messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages,
    totalCount,
  }
}

export const generateSummaryDraft = async (
  companyId: string,
  periodStart: Date,
  periodEnd: Date
) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) {
    throw new Error('Company not found')
  }

  const { messages } = await selectMessagesForSummary(companyId, periodStart, periodEnd)

  let content = buildEmptySummary()
  let sourceLinks: string[] = []
  let model: string | null = null
  let promptVersion: string | null = null
  let sourceMessageCount = messages.length
  let tokenUsage: Prisma.InputJsonValue | undefined

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
    tokenUsage = result.metadata?.tokenUsage
      ? (result.metadata.tokenUsage as Prisma.InputJsonValue)
      : undefined
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
