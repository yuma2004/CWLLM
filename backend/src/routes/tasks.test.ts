import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import bcrypt from 'bcryptjs'
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
    const user = await createUser(`task-owner-${Date.now()}@example.com`, UserRole.employee)
    const token = fastify.jwt.sign({ userId: user.id, role: 'employee' })

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
        authorization: `Bearer ${token}`,
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

  it('allows only admin to list all tasks', async () => {
    const admin = await createUser(`task-admin-${Date.now()}@example.com`, UserRole.admin)
    const employee = await createUser(`task-employee-${Date.now()}@example.com`, UserRole.employee)
    const adminToken = fastify.jwt.sign({ userId: admin.id, role: 'admin' })
    const employeeToken = fastify.jwt.sign({ userId: employee.id, role: 'employee' })

    const employeeResponse = await fastify.inject({
      method: 'GET',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${employeeToken}`,
      },
    })

    expect(employeeResponse.statusCode).toBe(403)

    const adminResponse = await fastify.inject({
      method: 'GET',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(adminResponse.statusCode).toBe(200)
  })

  it('rejects invalid role create', async () => {
    const token = fastify.jwt.sign({ userId: 'invalid', role: 'invalid-role' })
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

    expect(response.statusCode).toBe(401)
  })

  it('filters my tasks by targetType', async () => {
    const user = await createUser(`task-filter-${Date.now()}@example.com`, UserRole.employee)
    const token = fastify.jwt.sign({ userId: user.id, role: 'employee' })

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

  it('creates general tasks without a linked target entity', async () => {
    const admin = await createUser(`task-general-${Date.now()}@example.com`, UserRole.admin)
    const token = fastify.jwt.sign({ userId: admin.id, role: 'admin' })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        targetType: 'general',
        targetId: 'general',
        title: 'Internal task',
      },
    })

    expect(createResponse.statusCode).toBe(201)

    const listResponse = await fastify.inject({
      method: 'GET',
      url: '/api/tasks?targetType=general',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const listBody = JSON.parse(listResponse.body)
    expect(listBody.items.length).toBe(1)
    expect(listBody.items[0].title).toBe('Internal task')
  })

  it('allows admin to filter tasks by assigneeId', async () => {
    const admin = await createUser(`task-admin-${Date.now()}@example.com`, UserRole.admin)
    const assignee = await createUser(`task-assignee-${Date.now()}@example.com`, UserRole.employee)
    const other = await createUser(`task-other-${Date.now()}@example.com`, UserRole.employee)
    const adminToken = fastify.jwt.sign({ userId: admin.id, role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Assignee Co',
        normalizedName: 'assigneeco',
        status: 'active',
        tags: [],
      },
    })

    await prisma.task.create({
      data: {
        title: 'Assignee task',
        targetType: 'company',
        targetId: company.id,
        assigneeId: assignee.id,
        status: 'todo',
      },
    })
    await prisma.task.create({
      data: {
        title: 'Other task',
        targetType: 'company',
        targetId: company.id,
        assigneeId: other.id,
        status: 'todo',
      },
    })

    const response = await fastify.inject({
      method: 'GET',
      url: `/api/tasks?assigneeId=${assignee.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.items.length).toBe(1)
    expect(body.items[0].title).toBe('Assignee task')
  })

  it('rejects non-assignee updates and deletes', async () => {
    const owner = await createUser(`task-owner-${Date.now()}@example.com`, UserRole.employee)
    const other = await createUser(`task-other-${Date.now()}@example.com`, UserRole.employee)
    const otherToken = fastify.jwt.sign({ userId: other.id, role: 'employee' })

    const company = await prisma.company.create({
      data: {
        name: 'Guarded Co',
        normalizedName: 'guardedco',
        status: 'active',
        tags: [],
      },
    })

    const task = await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Private task',
        status: 'todo',
        assigneeId: owner.id,
      },
    })

    const updateResponse = await fastify.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
      payload: {
        status: 'done',
      },
    })

    expect(updateResponse.statusCode).toBe(404)

    const bulkResponse = await fastify.inject({
      method: 'PATCH',
      url: '/api/tasks/bulk',
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
      payload: {
        taskIds: [task.id],
        status: 'done',
      },
    })

    expect(bulkResponse.statusCode).toBe(404)

    const deleteResponse = await fastify.inject({
      method: 'DELETE',
      url: `/api/tasks/${task.id}`,
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    })

    expect(deleteResponse.statusCode).toBe(404)
  })

  it('filters target tasks by due date range', async () => {
    const user = await createUser(`task-due-${Date.now()}@example.com`, UserRole.employee)
    const token = fastify.jwt.sign({ userId: user.id, role: 'employee' })

    const company = await prisma.company.create({
      data: {
        name: 'Due Co',
        normalizedName: 'dueco',
        status: 'active',
        tags: [],
      },
    })

    const dueSoon = new Date(Date.now() + 86400000 * 2)
    const dueLater = new Date(Date.now() + 86400000 * 10)

    const soonTask = await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Soon task',
        status: 'todo',
        dueDate: dueSoon,
        assigneeId: user.id,
      },
    })

    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Later task',
        status: 'todo',
        dueDate: dueLater,
        assigneeId: user.id,
      },
    })

    const dueTo = new Date(Date.now() + 86400000 * 3).toISOString()
    const response = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/tasks?dueTo=${encodeURIComponent(dueTo)}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].id).toBe(soonTask.id)
  })
})
