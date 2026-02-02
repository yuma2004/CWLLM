import crypto from 'node:crypto'
import IORedis from 'ioredis'
import { FastifyReply, FastifyRequest } from 'fastify'
import { badRequest, handlePrismaError, prisma, unauthorized } from '../utils'
import { env } from '../config/env'
import {
  enqueueChatworkMessagesSync,
  enqueueChatworkRoomsSync,
} from '../services'
import type {
  ChatworkWebhookBody,
  ChatworkWebhookPayload,
  MessageSyncQuery,
  RoomLinkBody,
  RoomToggleBody,
} from './chatwork.schemas'
import { chatworkWebhookPayloadSchema } from './chatwork.schemas'

const prismaErrorOverrides = {
  P2002: { status: 409, message: 'Duplicate record' },
}

const webhookEventTypes = new Set(['message_created', 'message_updated', 'mention_to_me'])
const webhookRoomCooldowns = new Map<string, number>()
const WEBHOOK_COOLDOWN_KEY_PREFIX = 'cwllm:chatwork:webhook-cooldown:'
let lastCooldownCleanupAt = 0
let webhookCooldownClient: IORedis | null = null

type Logger = {
  warn?: (obj: unknown, msg?: string) => void
}

const getHeaderValue = (value: string | string[] | undefined) => {
  if (!value) return undefined
  if (Array.isArray(value)) return value[0]
  return value
}

const getWebhookSignature = (
  request: FastifyRequest,
  payload: ChatworkWebhookPayload | null
) => {
  const header = getHeaderValue(request.headers['x-chatworkwebhooksignature'])?.trim()
  if (header) return header
  const query = request.query as { chatwork_webhook_signature?: string } | undefined
  if (query?.chatwork_webhook_signature) {
    const value = String(query.chatwork_webhook_signature).trim()
    if (value) return value
  }
  const payloadSignature = payload?.chatwork_webhook_signature?.trim()
  return payloadSignature || undefined
}

const parseWebhookPayload = (rawBody: string): ChatworkWebhookPayload | null => {
  try {
    const parsed = JSON.parse(rawBody)
    const result = chatworkWebhookPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const normalizeRoomId = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return null
}

const extractWebhookRoomId = (payload: ChatworkWebhookPayload) => {
  const event = payload.webhook_event
  const eventRoom =
    event?.room_id ??
    event?.roomId ??
    event?.room?.room_id ??
    event?.room?.roomId ??
    payload.room_id ??
    payload.roomId
  return normalizeRoomId(eventRoom)
}

const isValidWebhookSignature = (rawBody: string, token: string, signature: string) => {
  const secret = Buffer.from(token, 'base64')
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

const getWebhookCooldownClient = (logger?: Logger) => {
  if (!env.redisUrl) return null
  if (!webhookCooldownClient) {
    webhookCooldownClient = new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
    webhookCooldownClient.on('error', (err) => {
      logger?.warn?.({ err }, 'Chatwork webhook cooldown redis error')
    })
  }
  return webhookCooldownClient
}

const shouldEnqueueWebhook = async (roomId: string, now: number, logger?: Logger) => {
  const cooldownMs = env.chatworkWebhookCooldownMs
  if (cooldownMs <= 0) return true

  const redisClient = getWebhookCooldownClient(logger)
  if (redisClient) {
    try {
      const key = `${WEBHOOK_COOLDOWN_KEY_PREFIX}${roomId}`
      const result = await redisClient.set(key, String(now), 'PX', cooldownMs, 'NX')
      if (result === 'OK') return true
      return false
    } catch (err) {
      logger?.warn?.({ err }, 'Chatwork webhook cooldown redis set failed')
    }
  }

  if (now - lastCooldownCleanupAt > Math.max(cooldownMs, 60_000)) {
    const cutoff = now - Math.max(cooldownMs * 2, 60_000)
    for (const [key, timestamp] of webhookRoomCooldowns.entries()) {
      if (timestamp < cutoff) {
        webhookRoomCooldowns.delete(key)
      }
    }
    lastCooldownCleanupAt = now
  }
  const lastSeen = webhookRoomCooldowns.get(roomId)
  if (lastSeen && now - lastSeen < cooldownMs) {
    return false
  }
  webhookRoomCooldowns.set(roomId, now)
  return true
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

export const chatworkWebhookHandler = async (
  request: FastifyRequest<{
    Body: ChatworkWebhookBody
    Querystring: { chatwork_webhook_signature?: string }
  }>,
  reply: FastifyReply
) => {
  const rawBody = request.body
  const payload = rawBody ? parseWebhookPayload(rawBody) : null
  if (!payload) {
    return reply.code(200).send({ status: 'ignored', reason: 'invalid_body' })
  }

  const signature = getWebhookSignature(request, payload)
  if (env.chatworkWebhookToken) {
    if (!signature || !isValidWebhookSignature(rawBody, env.chatworkWebhookToken, signature)) {
      return reply.code(401).send(unauthorized('Invalid webhook signature'))
    }
  }

  const eventType =
    typeof payload.webhook_event_type === 'string' ? payload.webhook_event_type : null
  if (!eventType || !webhookEventTypes.has(eventType)) {
    return reply.code(200).send({ status: 'ignored', reason: 'unsupported_event' })
  }

  const roomId = extractWebhookRoomId(payload)
  if (!roomId) {
    return reply.code(200).send({ status: 'ignored', reason: 'missing_room_id' })
  }

  const room = await prisma.chatworkRoom.findUnique({ where: { roomId } })
  if (!room) {
    return reply.code(200).send({ status: 'ignored', reason: 'room_not_found' })
  }
  if (!room.isActive) {
    return reply.code(200).send({ status: 'ignored', reason: 'room_inactive' })
  }

  const now = Date.now()
  if (!(await shouldEnqueueWebhook(roomId, now, request.log))) {
    return reply.code(200).send({ status: 'ok', enqueued: false, reason: 'cooldown' })
  }

  const job = await enqueueChatworkMessagesSync(roomId)
  return reply.code(200).send({ status: 'ok', enqueued: true, jobId: job.id })
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
