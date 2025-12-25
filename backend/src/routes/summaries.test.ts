import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { PrismaClient } from '@prisma/client'
import { summaryRoutes } from './summaries'

const prisma = new PrismaClient()

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
  await app.register(summaryRoutes, { prefix: '/api' })
  return app
}

describe('Summary endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.summary.deleteMany()
    await prisma.message.deleteMany()
    await prisma.chatworkRoom.deleteMany()
    await prisma.company.deleteMany()
    await fastify.close()
  })

  it('creates draft, saves summary, and extracts candidates', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Summary Co',
        normalizedName: 'summaryco',
        status: 'active',
        tags: [],
      },
    })

    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: 'room-1',
        name: 'Room',
      },
    })

    const sentAt = new Date()
    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'm-1',
        sender: 'User',
        body: 'TODO: follow up on pricing',
        sentAt,
        companyId: company.id,
      },
    })

    const draftResponse = await fastify.inject({
      method: 'POST',
      url: `/api/companies/${company.id}/summaries/draft`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        periodStart: new Date(sentAt.getTime() - 1000).toISOString(),
        periodEnd: new Date(sentAt.getTime() + 1000).toISOString(),
      },
    })

    expect(draftResponse.statusCode).toBe(200)
    const draft = JSON.parse(draftResponse.body).draft
    expect(draft.content).toContain('Summary')

    const saveResponse = await fastify.inject({
      method: 'POST',
      url: `/api/companies/${company.id}/summaries`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        content: '## Next Actions\n- Follow up 2024-01-01',
        type: 'manual',
        periodStart: draft.periodStart,
        periodEnd: draft.periodEnd,
        sourceLinks: draft.sourceLinks,
      },
    })

    expect(saveResponse.statusCode).toBe(201)
    const summary = JSON.parse(saveResponse.body).summary

    const listResponse = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/summaries`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const listBody = JSON.parse(listResponse.body)
    expect(listBody.summaries.length).toBe(1)

    const candidateResponse = await fastify.inject({
      method: 'POST',
      url: `/api/summaries/${summary.id}/tasks/candidates`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const candidates = JSON.parse(candidateResponse.body).candidates
    expect(candidates.length).toBeGreaterThan(0)
  })
})
