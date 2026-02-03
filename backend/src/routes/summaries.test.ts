import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient } from '@prisma/client'
import { summaryRoutes } from './summaries'

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
  await app.register(summaryRoutes, { prefix: '/api' })
  return app
}

describe('Summary endpoints', () => {
  let fastify: FastifyInstance
  let userId: string

  beforeEach(async () => {
    fastify = await buildTestServer()
    const user = await prisma.user.create({
      data: {
        email: `summary-test-${Date.now()}@example.com`,
        password: 'password',
        role: 'admin',
      },
    })
    userId = user.id
  })

  afterEach(async () => {
    await prisma.summary.deleteMany()
    await prisma.company.deleteMany()
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'summary-' },
      },
    })
    await fastify.close()
  })

  it('creates summary and extracts candidates', async () => {
    const token = fastify.jwt.sign({ userId, role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Summary Co',
        normalizedName: 'summaryco',
        status: 'active',
        tags: [],
      },
    })

    const periodStart = new Date(Date.now() - 1000)
    const periodEnd = new Date(Date.now() + 1000)

    const saveResponse = await fastify.inject({
      method: 'POST',
      url: `/api/companies/${company.id}/summaries`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        content: '## Next Actions\n- Follow up 2024-01-01',
        type: 'manual',
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        sourceLinks: [],
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
