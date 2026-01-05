import { FastifyInstance } from 'fastify'
import { requireAdmin, requireAuth, requireWriteAccess } from '../middleware/rbac'
import { ChatworkApiError, createChatworkClient } from '../services/chatwork'
import { handlePrismaError, prisma } from '../utils/prisma'

interface RoomToggleBody {
  isActive: boolean
}

interface RoomLinkBody {
  roomId?: string
  chatworkRoomId?: string
}

interface MessageSyncQuery {
  roomId?: string
}

const toBigInt = (value?: string | null) => {
  if (!value) return null
  if (!/^\d+$/.test(value)) return null
  try {
    return BigInt(value)
  } catch (err) {
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

const prismaErrorOverrides = {
  P2002: { status: 409, message: 'Duplicate record' },
}

const truncateError = (message: string) =>
  message.length > 500 ? `${message.slice(0, 497)}...` : message

export async function chatworkRoutes(fastify: FastifyInstance) {
  const getClient = () =>
    createChatworkClient({
      token: process.env.CHATWORK_API_TOKEN,
      baseUrl: process.env.CHATWORK_API_BASE_URL,
      logger: fastify.log,
    })

  fastify.get('/chatwork/rooms', { preHandler: requireAdmin() }, async () => {
    const rooms = await prisma.chatworkRoom.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return { rooms }
  })

  fastify.post(
    '/chatwork/rooms/sync',
    { preHandler: requireAdmin() },
    async (_request, reply) => {
      try {
        const rooms = await getClient().listRooms()
        let created = 0
        let updated = 0

        for (const room of rooms) {
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
      } catch (error) {
        if (error instanceof Error && error.message.includes('CHATWORK_API_TOKEN')) {
          return reply.code(400).send({ error: 'CHATWORK_API_TOKEN is not set' })
        }
        if (error instanceof ChatworkApiError) {
          return reply.code(502).send({ error: error.body })
        }
        throw error
      }
    }
  )

  fastify.patch<{ Params: { id: string }; Body: RoomToggleBody }>(
    '/chatwork/rooms/:id',
    { preHandler: requireAdmin() },
    async (request, reply) => {
      const { isActive } = request.body
      if (typeof isActive !== 'boolean') {
        return reply.code(400).send({ error: 'isActive is required' })
      }

      try {
        const room = await prisma.chatworkRoom.update({
          where: { id: request.params.id },
          data: { isActive },
        })
        return { room }
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )

  fastify.post<{ Querystring: MessageSyncQuery }>(
    '/chatwork/messages/sync',
    { preHandler: requireAdmin() },
    async (request, reply) => {
      const where = request.query.roomId
        ? { roomId: request.query.roomId }
        : { isActive: true }

      const rooms = await prisma.chatworkRoom.findMany({
        where,
        include: { roomLinks: true },
      })

      const results = []
      const errors: { roomId: string; message: string }[] = []

      for (const room of rooms) {
        const linkedCompanies = room.roomLinks.map((link) => link.companyId)
        const companyId = linkedCompanies.length === 1 ? linkedCompanies[0] : null
        if (linkedCompanies.length > 1) {
          fastify.log.warn(
            `Multiple company links found for room ${room.roomId}, skipping auto-assign`
          )
        }

        try {
          const messages = await getClient().listMessages(
            room.roomId,
            room.lastMessageId === null
          )

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
          if (error instanceof Error && error.message.includes('CHATWORK_API_TOKEN')) {
            return reply.code(400).send({ error: 'CHATWORK_API_TOKEN is not set' })
          }
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
          fastify.log.error({ err: error }, `Chatwork sync failed for room ${room.roomId}`)
        }
      }

      return reply.send({ rooms: results, errors })
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/companies/:id/chatwork-rooms',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const company = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      const links = await prisma.companyRoomLink.findMany({
        where: { companyId: request.params.id },
        include: { room: true },
      })

      return {
        rooms: links.map((link) => ({
          id: link.room.id,
          roomId: link.room.roomId,
          name: link.room.name,
          isActive: link.room.isActive,
        })),
      }
    }
  )

  fastify.post<{ Params: { id: string }; Body: RoomLinkBody }>(
    '/companies/:id/chatwork-rooms',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { roomId, chatworkRoomId } = request.body
      if (!roomId && !chatworkRoomId) {
        return reply.code(400).send({ error: 'roomId is required' })
      }

      const company = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      const room = await prisma.chatworkRoom.findFirst({
        where: roomId ? { roomId } : { id: chatworkRoomId },
      })
      if (!room) {
        return reply.code(404).send({ error: 'Room not found' })
      }

      try {
        const link = await prisma.companyRoomLink.create({
          data: {
            companyId: company.id,
            chatworkRoomId: room.id,
          },
        })

        await prisma.message.updateMany({
          where: {
            chatworkRoomId: room.id,
            companyId: null,
          },
          data: {
            companyId: company.id,
          },
        })

        return reply.code(201).send({ link })
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )

  fastify.delete<{ Params: { id: string; roomId: string } }>(
    '/companies/:id/chatwork-rooms/:roomId',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const room = await prisma.chatworkRoom.findUnique({
        where: { roomId: request.params.roomId },
      })
      if (!room) {
        return reply.code(404).send({ error: 'Room not found' })
      }

      try {
        await prisma.companyRoomLink.delete({
          where: {
            companyId_chatworkRoomId: {
              companyId: request.params.id,
              chatworkRoomId: room.id,
            },
          },
        })
        return reply.code(204).send()
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )
}
