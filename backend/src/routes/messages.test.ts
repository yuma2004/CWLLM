import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient } from '@prisma/client'
import { messageRoutes } from './messages'

const prisma = new PrismaClient()

const buildTestServer = async () => {
  const app = Fastify()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  await app.register(cors)
  await app.register(cookie)
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  })
  await app.register(messageRoutes, { prefix: '/api' })
  return app
}

describe('Message endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.message.deleteMany()
    await prisma.chatworkRoom.deleteMany()
    await prisma.company.deleteMany()
    await fastify.close()
  })

  it('lists company messages in descending order', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Timeline Co',
        normalizedName: 'timelineco',
        status: 'active',
        tags: [],
      },
    })
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: `room-${Date.now()}`,
        name: 'Room',
      },
    })

    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: '1',
        sender: 'a',
        body: 'old',
        sentAt: new Date('2024-01-01T00:00:00Z'),
        companyId: company.id,
      },
    })
    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: '2',
        sender: 'b',
        body: 'new',
        sentAt: new Date('2024-01-02T00:00:00Z'),
        companyId: company.id,
      },
    })

    const response = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/messages`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.items[0].body).toBe('new')
  })

  it('paginates without overlapping messages', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Paging Co',
        normalizedName: 'pagingco',
        status: 'active',
        tags: [],
      },
    })
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: `room-${Date.now()}`,
        name: 'Room',
      },
    })

    const messageA = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'a',
        sender: 'a',
        body: 'first',
        sentAt: new Date('2024-01-03T00:00:00Z'),
        companyId: company.id,
      },
    })
    const messageB = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'b',
        sender: 'b',
        body: 'second',
        sentAt: new Date('2024-01-02T00:00:00Z'),
        companyId: company.id,
      },
    })
    const messageC = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'c',
        sender: 'c',
        body: 'third',
        sentAt: new Date('2024-01-01T00:00:00Z'),
        companyId: company.id,
      },
    })

    const pageOne = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/messages?page=1&pageSize=2`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(pageOne.statusCode).toBe(200)
    const pageOneBody = JSON.parse(pageOne.body)
    expect(pageOneBody.items).toHaveLength(2)
    expect(pageOneBody.items.map((item: { id: string }) => item.id)).toEqual([
      messageA.id,
      messageB.id,
    ])

    const pageTwo = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/messages?page=2&pageSize=2`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(pageTwo.statusCode).toBe(200)
    const pageTwoBody = JSON.parse(pageTwo.body)
    expect(pageTwoBody.items).toHaveLength(1)
    expect(pageTwoBody.items[0].id).toBe(messageC.id)
  })

  it('searches messages across companies', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    const company = await prisma.company.create({
      data: {
        name: 'Search Co',
        normalizedName: 'searchco',
        status: 'active',
        tags: [],
      },
    })
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: `room-${Date.now()}`,
        name: 'Room',
      },
    })
    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: '100',
        sender: 'sender',
        body: 'alpha beta',
        sentAt: new Date(),
        companyId: company.id,
      },
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/messages/search?q=alpha',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.items.length).toBe(1)
  })

  it('adds and removes message labels', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    const company = await prisma.company.create({
      data: {
        name: 'Label Co',
        normalizedName: 'labelco',
        status: 'active',
        tags: [],
      },
    })
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: `room-${Date.now()}`,
        name: 'Room',
      },
    })
    const message = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: '500',
        sender: 'sender',
        body: 'label target',
        sentAt: new Date(),
        companyId: company.id,
      },
    })

    const addLabel = await fastify.inject({
      method: 'POST',
      url: `/api/messages/${message.id}/labels`,
      headers: { authorization: `Bearer ${token}` },
      payload: { label: 'VIP' },
    })
    expect(addLabel.statusCode).toBe(200)

    const labeled = await prisma.message.findUnique({ where: { id: message.id } })
    expect(labeled?.labels).toContain('VIP')

    const filtered = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/messages?label=VIP`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(filtered.statusCode).toBe(200)
    const filteredBody = JSON.parse(filtered.body)
    expect(filteredBody.items).toHaveLength(1)

    const removeLabel = await fastify.inject({
      method: 'DELETE',
      url: `/api/messages/${message.id}/labels/VIP`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(removeLabel.statusCode).toBe(200)

    const removed = await prisma.message.findUnique({ where: { id: message.id } })
    expect(removed?.labels).not.toContain('VIP')
  })

  it('refreshes message label cache after update', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    const uniqueLabel = `cache-label-${Date.now()}`

    const company = await prisma.company.create({
      data: {
        name: 'Cache Label Co',
        normalizedName: `cachelabelco-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: `room-${Date.now()}`,
        name: 'Room',
      },
    })
    const message = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'cache-1',
        sender: 'sender',
        body: 'cache label target',
        sentAt: new Date(),
        companyId: company.id,
      },
    })

    await fastify.inject({
      method: 'GET',
      url: '/api/messages/labels',
      headers: { authorization: `Bearer ${token}` },
    })

    const addLabel = await fastify.inject({
      method: 'POST',
      url: `/api/messages/${message.id}/labels`,
      headers: { authorization: `Bearer ${token}` },
      payload: { label: uniqueLabel },
    })
    expect(addLabel.statusCode).toBe(200)

    const labelsResponse = await fastify.inject({
      method: 'GET',
      url: '/api/messages/labels',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(labelsResponse.statusCode).toBe(200)
    const labelsBody = JSON.parse(labelsResponse.body)
    const labels = labelsBody.items.map((item: { label: string }) => item.label)
    expect(labels).toContain(uniqueLabel)
  })

  it('returns unassigned messages and allows assigning company', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })
    const company = await prisma.company.create({
      data: {
        name: 'Assign Co',
        normalizedName: 'assignco',
        status: 'active',
        tags: [],
      },
    })
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: `room-${Date.now()}`,
        name: 'Room',
      },
    })
    const message = await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: '200',
        sender: 'sender',
        body: 'unassigned',
        sentAt: new Date(),
      },
    })

    const unassigned = await fastify.inject({
      method: 'GET',
      url: '/api/messages/unassigned',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(unassigned.statusCode).toBe(200)
    const unassignedBody = JSON.parse(unassigned.body)
    expect(unassignedBody.items.length).toBe(1)

    const assign = await fastify.inject({
      method: 'PATCH',
      url: `/api/messages/${message.id}/assign-company`,
      headers: { authorization: `Bearer ${token}` },
      payload: { companyId: company.id },
    })
    expect(assign.statusCode).toBe(200)

    const updated = await prisma.message.findUnique({ where: { id: message.id } })
    expect(updated?.companyId).toBe(company.id)
  })
})
