import { FastifyReply, FastifyRequest } from 'fastify'
import { badRequest, handlePrismaError, prisma } from '../utils'
import { env } from '../config/env'
import {
  enqueueChatworkMessagesSync,
  enqueueChatworkRoomsSync,
} from '../services'
import type { MessageSyncQuery, RoomLinkBody, RoomToggleBody } from './chatwork.schemas'

const prismaErrorOverrides = {
  P2002: { status: 409, message: 'Duplicate record' },
}

export const listChatworkRoomsHandler = async () => {
  const rooms = await prisma.chatworkRoom.findMany({
    orderBy: { updatedAt: 'desc' },
  })
  return { rooms }
}

export const syncChatworkRoomsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (!env.chatworkApiToken) {
    return reply.code(400).send(badRequest('CHATWORK_API_TOKEN is not set'))
  }
  const userId = (request.user as { userId?: string } | undefined)?.userId
  const job = await enqueueChatworkRoomsSync(userId)
  return { jobId: job.id, status: job.status }
}

export const toggleChatworkRoomHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: RoomToggleBody }>,
  reply: FastifyReply
) => {
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

export const syncChatworkMessagesHandler = async (
  request: FastifyRequest<{ Querystring: MessageSyncQuery }>,
  reply: FastifyReply
) => {
  if (!env.chatworkApiToken) {
    return reply.code(400).send(badRequest('CHATWORK_API_TOKEN is not set'))
  }
  const userId = (request.user as { userId?: string } | undefined)?.userId
  const job = await enqueueChatworkMessagesSync(request.query.roomId, userId)
  return { jobId: job.id, status: job.status }
}

export const listCompanyChatworkRoomsHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
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

export const createCompanyChatworkRoomLinkHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: RoomLinkBody }>,
  reply: FastifyReply
) => {
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

export const deleteCompanyChatworkRoomLinkHandler = async (
  request: FastifyRequest<{ Params: { id: string; roomId: string } }>,
  reply: FastifyReply
) => {
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
