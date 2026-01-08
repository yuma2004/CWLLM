import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { JobType } from '@prisma/client'
import { requireAdmin, requireAuth, requireWriteAccess } from '../middleware/rbac'
import { env } from '../config/env'
import { badRequest } from '../utils/errors'
import { handlePrismaError, prisma } from '../utils/prisma'
import { enqueueJob } from '../services/jobQueue'
import { apiErrorSchema } from './shared/schemas'

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
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get(
    '/chatwork/rooms',
    {
      preHandler: requireAdmin(),
      schema: {
        response: {
          200: z.object({ rooms: z.array(z.any()) }),
        },
      },
    },
    async () => {
      const rooms = await prisma.chatworkRoom.findMany({
        orderBy: { updatedAt: 'desc' },
      })
      return { rooms }
    }
  )

  app.post(
    '/chatwork/rooms/sync',
    {
      preHandler: requireAdmin(),
      schema: {
        response: {
          200: z.object({ jobId: z.string(), status: z.string() }),
          400: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if (!env.chatworkApiToken) {
        return reply.code(400).send(badRequest('CHATWORK_API_TOKEN is not set'))
      }
      const userId = (request.user as { userId?: string } | undefined)?.userId
      const job = await enqueueJob(JobType.chatwork_rooms_sync, {}, userId)
      return { jobId: job.id, status: job.status }
    }
  )

  app.patch<{ Params: { id: string }; Body: RoomToggleBody }>(
    '/chatwork/rooms/:id',
    {
      preHandler: requireAdmin(),
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({ isActive: z.boolean() }),
        response: {
          200: z.object({ room: z.any() }),
        },
      },
    },
    async (request, reply) => {
      const { isActive } = request.body

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

  app.post<{ Querystring: MessageSyncQuery }>(
    '/chatwork/messages/sync',
    {
      preHandler: requireAdmin(),
      schema: {
        querystring: z.object({ roomId: z.string().min(1).optional() }),
        response: {
          200: z.object({ jobId: z.string(), status: z.string() }),
          400: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if (!env.chatworkApiToken) {
        return reply.code(400).send(badRequest('CHATWORK_API_TOKEN is not set'))
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

  app.get<{ Params: { id: string } }>(
    '/companies/:id/chatwork-rooms',
    {
      preHandler: requireAuth(),
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          200: z.object({ rooms: z.array(z.any()) }),
        },
      },
    },
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

  app.post<{ Params: { id: string }; Body: RoomLinkBody }>(
    '/companies/:id/chatwork-rooms',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({
          roomId: z.string().min(1).optional(),
          chatworkRoomId: z.string().min(1).optional(),
        }),
        response: {
          201: z.object({ link: z.any() }),
        },
      },
    },
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

  app.delete<{ Params: { id: string; roomId: string } }>(
    '/companies/:id/chatwork-rooms/:roomId',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: z.object({
          id: z.string().min(1),
          roomId: z.string().min(1),
        }),
        response: {
          204: z.null(),
        },
      },
    },
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
