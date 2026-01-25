import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient } from '@prisma/client'
import { dashboardRoutes } from './dashboard'

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
  await app.register(dashboardRoutes, { prefix: '/api' })
  return app
}

describe('Admin tools endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.task.deleteMany()
    await prisma.summary.deleteMany()
    await prisma.company.deleteMany()
    await fastify.close()
  })

  it('returns dashboard data', async () => {
    const token = fastify.jwt.sign({ userId: 'admin', role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Export Co',
        normalizedName: 'exportco',
        status: 'active',
        tags: [],
      },
    })

    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Overdue',
        status: 'todo',
        dueDate: new Date(Date.now() - 86400000),
      },
    })

    await prisma.summary.create({
      data: {
        companyId: company.id,
        periodStart: new Date(Date.now() - 86400000 * 7),
        periodEnd: new Date(),
        content: 'Summary content',
        type: 'manual',
        sourceLinks: [],
      },
    })

    const dashboardResponse = await fastify.inject({
      method: 'GET',
      url: '/api/dashboard',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(dashboardResponse.statusCode).toBe(200)
    const dashboardBody = JSON.parse(dashboardResponse.body)
    expect(Array.isArray(dashboardBody.overdueTasks)).toBe(true)
    expect(Array.isArray(dashboardBody.todayTasks)).toBe(true)
    expect(Array.isArray(dashboardBody.soonTasks)).toBe(true)
    expect(Array.isArray(dashboardBody.weekTasks)).toBe(true)
    expect(dashboardBody.overdueTasks.length).toBeGreaterThan(0)
    expect(dashboardBody.latestSummaries.length).toBeGreaterThan(0)
    expect(dashboardBody.recentCompanies.length).toBeGreaterThan(0)

  })
})
