import { FastifyInstance } from 'fastify'
import { JobType } from '@prisma/client'
import { requireAdmin, requireAuth, requireWriteAccess } from '../middleware/rbac'
import { env } from '../config/env'
import { handlePrismaError, prisma } from '../utils/prisma'
import { enqueueJob } from '../services/jobQueue'

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

const prismaErrorOverrides = {
  P2002: { status: 409, message: 'Duplicate record' },
}

export async function chatworkRoutes(fastify: FastifyInstance) {
  fastify.get('/chatwork/rooms', { preHandler: requireAdmin() }, async () => {
    const rooms = await prisma.chatworkRoom.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return { rooms }
  })

  fastify.post(
    '/chatwork/rooms/sync',
    { preHandler: requireAdmin() },
    async (request, reply) => {
      if (!env.chatworkApiToken) {
        return reply.code(400).send({ error: 'CHATWORK_API_TOKEN is not set' })
      }
      const userId = (request.user as { userId?: string } | undefined)?.userId
      const job = await enqueueJob(JobType.chatwork_rooms_sync, {}, userId)
      return { jobId: job.id, status: job.status }
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
      if (!env.chatworkApiToken) {
        return reply.code(400).send({ error: 'CHATWORK_API_TOKEN is not set' })
      }
      const userId = (request.user as { userId?: string } | undefined)?.userId
      const job = await enqueueJob(
        JobType.chatwork_messages_sync,
        { roomId: request.query.roomId },
        userId
      )
      return { jobId: job.id, status: job.status }
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
