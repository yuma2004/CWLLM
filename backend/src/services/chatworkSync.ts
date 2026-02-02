import { Prisma } from '@prisma/client'
import { env } from '../config/env'
import { prisma } from '../utils'
import { ChatworkApiError, createChatworkClient } from './chatwork'
import { JobCanceledError } from './jobErrors'

const toBigInt = (value?: string | null) => {
  if (!value) return null
  if (!/^\d+$/.test(value)) return null
  try {
    return BigInt(value)
  } catch {
    return null
  }
}

const pickLatestMessageId = (current: string | null, messageIds: string[]) => {
  let latest = current
  let latestBig = toBigInt(current)

  for (const messageId of messageIds) {
    const candidateBig = toBigInt(messageId)
    if (candidateBig && latestBig) {
      if (candidateBig > latestBig) {
        latest = messageId
        latestBig = candidateBig
      }
      continue
    }
    if (!latest) {
      latest = messageId
      latestBig = candidateBig
      continue
    }
    if (messageId > latest) {
      latest = messageId
      latestBig = candidateBig
    }
  }

  return latest
}

const truncateError = (message: string) =>
  message.length > 500 ? `${message.slice(0, 497)}...` : message

type CancelChecker = () => Promise<boolean>
type MessageSyncOptions = {
  roomLimit?: number
}

export interface ChatworkRoomsSyncResult {
  created: number
  updated: number
  total: number
}

export interface ChatworkMessagesSyncResult {
  rooms: Array<{ roomId: string; fetched: number }>
  errors: Array<{ roomId: string; message: string }>
}

export const syncChatworkRooms = async (
  shouldCancel?: CancelChecker,
  logger?: { warn: (message: string) => void }
): Promise<ChatworkRoomsSyncResult> => {
  if (shouldCancel && (await shouldCancel())) {
    throw new JobCanceledError()
  }

  const client = createChatworkClient({
    token: env.chatworkApiToken,
    baseUrl: env.chatworkApiBaseUrl,
    logger,
  })
  const rooms = await client.listRooms()
  let created = 0
  let updated = 0

  for (const room of rooms) {
    if (shouldCancel && (await shouldCancel())) {
      throw new JobCanceledError()
    }
    const result = await prisma.chatworkRoom.upsert({
      where: { roomId: String(room.room_id) },
      update: {
        name: room.name,
        description: room.description ?? null,
      },
      create: {
        roomId: String(room.room_id),
        name: room.name,
        description: room.description ?? null,
        isActive: env.chatworkNewRoomsActive,
      },
    })

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created += 1
    } else {
      updated += 1
    }
  }

  return { created, updated, total: rooms.length }
}

const fetchRoomsForSync = async (
  where: Prisma.ChatworkRoomWhereInput,
  limit?: number
) => {
  if (!limit) {
    return prisma.chatworkRoom.findMany({
      where,
      include: { roomLinks: true },
    })
  }

  const rooms = await prisma.chatworkRoom.findMany({
    where: { ...where, lastSyncAt: null },
    include: { roomLinks: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  const remaining = limit - rooms.length
  if (remaining <= 0) return rooms

  const syncedRooms = await prisma.chatworkRoom.findMany({
    where: { ...where, lastSyncAt: { not: null } },
    include: { roomLinks: true },
    orderBy: { lastSyncAt: 'asc' },
    take: remaining,
  })

  return [...rooms, ...syncedRooms]
}

export const syncChatworkMessages = async (
  roomId: string | undefined,
  shouldCancel?: CancelChecker,
  logger?: { warn: (message: string) => void },
  options?: MessageSyncOptions
): Promise<ChatworkMessagesSyncResult> => {
  const client = createChatworkClient({
    token: env.chatworkApiToken,
    baseUrl: env.chatworkApiBaseUrl,
    logger,
  })

  const where = roomId ? { roomId } : { isActive: true }
  const rooms = roomId
    ? await prisma.chatworkRoom.findMany({ where, include: { roomLinks: true } })
    : await fetchRoomsForSync(where, options?.roomLimit)

  const results: ChatworkMessagesSyncResult['rooms'] = []
  const errors: ChatworkMessagesSyncResult['errors'] = []

  for (const room of rooms) {
    if (shouldCancel && (await shouldCancel())) {
      throw new JobCanceledError()
    }

    const linkedCompanies = room.roomLinks.map((link) => link.companyId)
    const companyId = linkedCompanies.length === 1 ? linkedCompanies[0] : null
    if (linkedCompanies.length > 1) {
      logger?.warn(`Multiple company links found for room ${room.roomId}, skipping auto-assign`)
    }

    try {
      const messages = await client.listMessages(room.roomId, room.lastMessageId === null)

      const data = messages.map((message) => ({
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: String(message.message_id),
        sender: message.account?.name || 'unknown',
        body: message.body,
        sentAt: new Date(message.send_time * 1000),
        companyId,
      }))

      if (data.length > 0) {
        const messageIds = data.map((message) => message.messageId)
        const existing = await prisma.message.findMany({
          where: {
            roomId: room.roomId,
            messageId: { in: messageIds },
          },
          select: {
            id: true,
            messageId: true,
            body: true,
            sender: true,
            sentAt: true,
          },
        })
        const existingMap = new Map(existing.map((item) => [item.messageId, item]))
        const createData: typeof data = []
        const updates: Array<ReturnType<typeof prisma.message.update>> = []

        for (const message of data) {
          const saved = existingMap.get(message.messageId)
          if (!saved) {
            createData.push(message)
            continue
          }

          const needsUpdate =
            saved.body !== message.body ||
            saved.sender !== message.sender ||
            saved.sentAt.getTime() !== message.sentAt.getTime()
          if (!needsUpdate) continue

          updates.push(
            prisma.message.update({
              where: { id: saved.id },
              data: {
                body: message.body,
                sender: message.sender,
                sentAt: message.sentAt,
              },
            })
          )
        }

        if (createData.length > 0) {
          await prisma.message.createMany({
            data: createData,
            skipDuplicates: true,
          })
        }

        if (updates.length > 0) {
          await prisma.$transaction(updates)
        }
      }

      const latestMessageId = pickLatestMessageId(
        room.lastMessageId,
        messages.map((message) => String(message.message_id))
      )

      await prisma.chatworkRoom.update({
        where: { id: room.id },
        data: {
          lastMessageId: latestMessageId,
          lastSyncAt: new Date(),
          lastErrorAt: null,
          lastErrorMessage: null,
          lastErrorStatus: null,
        },
      })

      results.push({
        roomId: room.roomId,
        fetched: messages.length,
      })
    } catch (error) {
      const message =
        error instanceof ChatworkApiError
          ? `${error.status}: ${error.body}`
          : error instanceof Error
            ? error.message
            : 'Unknown error'
      const status = error instanceof ChatworkApiError ? error.status : null
      const storedMessage = truncateError(message)
      await prisma.chatworkRoom.update({
        where: { id: room.id },
        data: {
          lastErrorAt: new Date(),
          lastErrorMessage: storedMessage,
          lastErrorStatus: status,
        },
      })
      errors.push({ roomId: room.roomId, message: storedMessage })
    }
  }

  return { rooms: results, errors }
}
