import { Prisma } from '@prisma/client'
import { env } from '../config/env'
import { prisma } from '../utils'
import { MESSAGE_LABEL_MAX_LENGTH } from '../routes/messages.schemas'
import { enqueueChatworkMessagesSync } from './jobQueue'

const ON_DEMAND_SYNC_MIN_INTERVAL_MS = 60_000

export type MessageSearchFilters = {
  query?: string
  messageId?: string
  companyId?: string | null
  label?: string
  fromDate?: Date
  toDate?: Date
}

type RoomSyncCandidate = {
  roomId: string
  isActive: boolean
  lastSyncAt: Date | null
  lastErrorAt: Date | null
  lastErrorStatus: number | null
}

type Logger = { warn: (obj: unknown, msg?: string) => void }

export const normalizeMessageLabel = (
  value?: string,
  maxLength: number = MESSAGE_LABEL_MAX_LENGTH
) => {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > maxLength) return null
  if (/[\r\n\t]/.test(trimmed)) return null
  return trimmed
}

export const buildMessageSearchWhere = (filters: MessageSearchFilters) => {
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

const isRoomSyncEligible = (room: RoomSyncCandidate) => {
  if (!room.isActive) return false
  const now = Date.now()
  const minIntervalMs = Math.max(
    ON_DEMAND_SYNC_MIN_INTERVAL_MS,
    env.chatworkAutoSyncIntervalMinutes * 60_000
  )
  if (room.lastErrorStatus === 429 && room.lastErrorAt) {
    const errorAgeMs = now - room.lastErrorAt.getTime()
    if (errorAgeMs < minIntervalMs) return false
  }
  if (!room.lastSyncAt) return true
  return now - room.lastSyncAt.getTime() >= minIntervalMs
}

export const enqueueOnDemandRoomSync = async (
  companyId: string,
  userId?: string,
  logger?: Logger
) => {
  if (!env.chatworkApiToken || !env.redisUrl) return

  const links = await prisma.companyRoomLink.findMany({
    where: { companyId },
    include: { room: true },
  })

  const rooms = links.map((link) => link.room).filter((room) => isRoomSyncEligible(room))
  if (rooms.length === 0) return

  rooms.sort((a, b) => {
    const aTime = a.lastSyncAt ? a.lastSyncAt.getTime() : 0
    const bTime = b.lastSyncAt ? b.lastSyncAt.getTime() : 0
    return aTime - bTime
  })

  const roomLimit = env.chatworkAutoSyncRoomLimit
  const targets = roomLimit ? rooms.slice(0, roomLimit) : rooms
  const results = await Promise.allSettled(
    targets.map((room) => enqueueChatworkMessagesSync(room.roomId, userId))
  )

  results.forEach((result) => {
    if (result.status === 'rejected') {
      logger?.warn({ err: result.reason }, 'Chatwork on-demand sync enqueue failed')
    }
  })
}
