import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient } from '@prisma/client'
import { companyRoutes } from './companies'
import { auditLogRoutes } from './audit-logs'

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
  await app.register(companyRoutes, { prefix: '/api' })
  await app.register(auditLogRoutes, { prefix: '/api' })
  return app
}

describe('Audit log endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.auditLog.deleteMany()
    await prisma.company.deleteMany()
    await fastify.close()
  })

  it('records audit logs for company updates', async () => {
    const token = fastify.jwt.sign({ userId: 'audit-user', role: 'admin' })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/companies',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Audit Co',
        tags: [],
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const company = JSON.parse(createResponse.body).company

    const updateResponse = await fastify.inject({
      method: 'PATCH',
      url: `/api/companies/${company.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        tags: ['vip'],
      },
    })

    expect(updateResponse.statusCode).toBe(200)

    const logsResponse = await fastify.inject({
      method: 'GET',
      url: `/api/audit-logs?entityType=Company&entityId=${company.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const logsBody = JSON.parse(logsResponse.body)
    expect(logsBody.items.length).toBeGreaterThan(1)
    expect(logsBody.items[0].userId).toBe('audit-user')
  })
})
