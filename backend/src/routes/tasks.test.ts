import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import bcrypt from 'bcrypt'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient, UserRole } from '@prisma/client'
import { taskRoutes } from './tasks'

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
  await app.register(taskRoutes, { prefix: '/api' })
  return app
}

const createUser = async (email: string, role: UserRole) => {
  const hashedPassword = await bcrypt.hash('password123', 10)
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
    },
  })
}

describe('Task endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.auditLog.deleteMany()
    await prisma.task.deleteMany()
    await prisma.company.deleteMany()
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'task-' },
      },
    })
    await fastify.close()
  })

  it('creates task and lists by company and assignee', async () => {
    const user = await createUser(`task-owner-${Date.now()}@example.com`, UserRole.sales)
    const token = fastify.jwt.sign({ userId: user.id, role: 'admin' })
    const assigneeToken = fastify.jwt.sign({ userId: user.id, role: 'sales' })

    const company = await prisma.company.create({
      data: {
        name: 'Task Co',
        normalizedName: 'taskco',
        status: 'active',
        tags: [],
      },
    })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        targetType: 'company',
        targetId: company.id,
        title: 'Follow up',
        assigneeId: user.id,
        dueDate: new Date().toISOString(),
      },
    })

    expect(createResponse.statusCode).toBe(201)
    const created = JSON.parse(createResponse.body).task

    const listResponse = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/tasks`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const listBody = JSON.parse(listResponse.body)
    expect(listBody.items.length).toBe(1)
    expect(listBody.items[0].id).toBe(created.id)

    const myResponse = await fastify.inject({
      method: 'GET',
      url: '/api/me/tasks',
      headers: {
        authorization: `Bearer ${assigneeToken}`,
      },
    })

    const myBody = JSON.parse(myResponse.body)
    expect(myBody.items.length).toBe(1)
    expect(myBody.items[0].title).toBe('Follow up')

    const updateResponse = await fastify.inject({
      method: 'PATCH',
      url: `/api/tasks/${created.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        status: 'done',
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    const updated = JSON.parse(updateResponse.body).task
    expect(updated.status).toBe('done')
  })

  it('rejects readonly create', async () => {
    const token = fastify.jwt.sign({ userId: 'readonly', role: 'readonly' })
    const company = await prisma.company.create({
      data: {
        name: 'Task Block',
        normalizedName: 'taskblock',
        status: 'active',
        tags: [],
      },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        targetType: 'company',
        targetId: company.id,
        title: 'Blocked',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('filters my tasks by targetType', async () => {
    const user = await createUser(`task-filter-${Date.now()}@example.com`, UserRole.sales)
    const token = fastify.jwt.sign({ userId: user.id, role: 'sales' })

    const company = await prisma.company.create({
      data: {
        name: 'Filter Co',
        normalizedName: 'filterco',
        status: 'active',
        tags: [],
      },
    })

    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Filter Project',
        status: 'active',
      },
    })

    await fastify.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        targetType: 'company',
        targetId: company.id,
        title: 'Company task',
        assigneeId: user.id,
      },
    })

    await fastify.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        targetType: 'project',
        targetId: project.id,
        title: 'Project task',
        assigneeId: user.id,
      },
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/me/tasks?targetType=project',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].title).toBe('Project task')
  })
})
