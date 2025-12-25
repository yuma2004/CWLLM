import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { PrismaClient } from '@prisma/client'
import { chatworkRoutes } from './chatwork'

const prisma = new PrismaClient()

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const buildResponse = (payload: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  )

const buildTestServer = async () => {
  const app = Fastify()
  await app.register(cors)
  await app.register(cookie)
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  })
  await app.register(chatworkRoutes, { prefix: '/api' })
  return app
}

describe('Chatwork sync', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    process.env.CHATWORK_API_TOKEN = 'test-token'
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.message.deleteMany()
    await prisma.companyRoomLink.deleteMany()
    await prisma.chatworkRoom.deleteMany()
    await prisma.company.deleteMany()
    await fastify.close()
  })

  it('syncs rooms and messages with company assignment', async () => {
    mockFetch.mockImplementation((input) => {
      const url = input.toString()
      if (url.endsWith('/rooms')) {
        return buildResponse([{ room_id: 100, name: 'Room A', description: 'desc' }])
      }
      if (url.includes('/rooms/100/messages')) {
        return buildResponse([
          {
            message_id: '10',
            body: 'hello',
            send_time: 1700000000,
            account: { account_id: 1, name: 'user' },
          },
        ])
      }
      return buildResponse([])
    })

    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const roomSync = await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/rooms/sync',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(roomSync.statusCode).toBe(200)

    const company = await prisma.company.create({
      data: {
        name: 'Acme Chat',
        normalizedName: 'acmechat',
        status: 'active',
        tags: [],
      },
    })

    const linkResponse = await fastify.inject({
      method: 'POST',
      url: `/api/companies/${company.id}/chatwork-rooms`,
      headers: { authorization: `Bearer ${token}` },
      payload: { roomId: '100' },
    })
    expect(linkResponse.statusCode).toBe(201)

    const syncResponse = await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/messages/sync',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(syncResponse.statusCode).toBe(200)

    const messages = await prisma.message.findMany({
      where: { companyId: company.id },
    })
    expect(messages.length).toBe(1)

    await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/messages/sync',
      headers: { authorization: `Bearer ${token}` },
    })
    const messagesAfter = await prisma.message.findMany({
      where: { companyId: company.id },
    })
    expect(messagesAfter.length).toBe(1)
  })

  it('skips inactive rooms during message sync', async () => {
    mockFetch.mockImplementation((input) => {
      const url = input.toString()
      if (url.endsWith('/rooms')) {
        return buildResponse([{ room_id: 200, name: 'Room B' }])
      }
      if (url.includes('/rooms/200/messages')) {
        return buildResponse([
          {
            message_id: '20',
            body: 'skip',
            send_time: 1700000100,
            account: { account_id: 2, name: 'user2' },
          },
        ])
      }
      return buildResponse([])
    })

    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/rooms/sync',
      headers: { authorization: `Bearer ${token}` },
    })

    const room = await prisma.chatworkRoom.findFirst({ where: { roomId: '200' } })
    expect(room).not.toBeNull()
    if (!room) return

    const toggleResponse = await fastify.inject({
      method: 'PATCH',
      url: `/api/chatwork/rooms/${room.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { isActive: false },
    })
    expect(toggleResponse.statusCode).toBe(200)

    await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/messages/sync',
      headers: { authorization: `Bearer ${token}` },
    })

    const messages = await prisma.message.findMany()
    expect(messages.length).toBe(0)
  })

  it('returns error summary when sync fails', async () => {
    mockFetch.mockImplementation((input) => {
      const url = input.toString()
      if (url.endsWith('/rooms')) {
        return buildResponse([{ room_id: 300, name: 'Room C' }])
      }
      if (url.includes('/rooms/300/messages')) {
        return buildResponse({ errors: ['failure'] }, 500)
      }
      return buildResponse([])
    })

    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/rooms/sync',
      headers: { authorization: `Bearer ${token}` },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/messages/sync',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.errors.length).toBe(1)
    expect(body.errors[0].roomId).toBe('300')

    const room = await prisma.chatworkRoom.findUnique({ where: { roomId: '300' } })
    expect(room?.lastErrorMessage).toBeTruthy()
  })

  it('clears recorded errors after a successful sync', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    mockFetch.mockImplementation((input) => {
      const url = input.toString()
      if (url.endsWith('/rooms')) {
        return buildResponse([{ room_id: 400, name: 'Room D' }])
      }
      if (url.includes('/rooms/400/messages')) {
        return buildResponse({ errors: ['failure'] }, 500)
      }
      return buildResponse([])
    })

    await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/rooms/sync',
      headers: { authorization: `Bearer ${token}` },
    })

    await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/messages/sync',
      headers: { authorization: `Bearer ${token}` },
    })

    const failedRoom = await prisma.chatworkRoom.findUnique({ where: { roomId: '400' } })
    expect(failedRoom?.lastErrorMessage).toBeTruthy()

    mockFetch.mockImplementation((input) => {
      const url = input.toString()
      if (url.endsWith('/rooms')) {
        return buildResponse([{ room_id: 400, name: 'Room D' }])
      }
      if (url.includes('/rooms/400/messages')) {
        return buildResponse([
          {
            message_id: '401',
            body: 'recovered',
            send_time: 1700000200,
            account: { account_id: 4, name: 'user4' },
          },
        ])
      }
      return buildResponse([])
    })

    const success = await fastify.inject({
      method: 'POST',
      url: '/api/chatwork/messages/sync',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(success.statusCode).toBe(200)

    const recovered = await prisma.chatworkRoom.findUnique({ where: { roomId: '400' } })
    expect(recovered?.lastErrorMessage).toBeNull()
    expect(recovered?.lastErrorAt).toBeNull()
  })
})
