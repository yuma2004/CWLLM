import { env } from '../config/env'
import { prisma } from '../utils'
import { ChatworkApiError, createChatworkClient } from './chatwork'

export class JobCanceledError extends Error {
  constructor() {
    super('Job canceled')
  }
}

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
        isActive: true,
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

export const syncChatworkMessages = async (
  roomId: string | undefined,
  shouldCancel?: CancelChecker,
  logger?: { warn: (message: string) => void }
): Promise<ChatworkMessagesSyncResult> => {
  const client = createChatworkClient({
    token: env.chatworkApiToken,
    baseUrl: env.chatworkApiBaseUrl,
    logger,
  })

  const where = roomId ? { roomId } : { isActive: true }
  const rooms = await prisma.chatworkRoom.findMany({
    where,
    include: { roomLinks: true },
  })

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
        await prisma.message.createMany({
          data,
          skipDuplicates: true,
        })
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
