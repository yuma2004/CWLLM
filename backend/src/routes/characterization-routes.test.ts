import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import {
  FeedbackType,
  JobStatus,
  JobType,
  PrismaClient,
  UserRole,
  WholesaleStatus,
} from '@prisma/client'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { dashboardRoutes } from './dashboard'
import { feedbackRoutes } from './feedback'
import { jobRoutes } from './jobs'
import { searchRoutes } from './search'
import { wholesaleRoutes } from './wholesales'

const prisma = new PrismaClient()

let fastify: FastifyInstance
let userSequence = 0

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
  await app.register(feedbackRoutes, { prefix: '/api' })
  await app.register(jobRoutes, { prefix: '/api' })
  await app.register(searchRoutes, { prefix: '/api' })
  await app.register(wholesaleRoutes, { prefix: '/api' })
  return app
}

const createUser = async (role: UserRole = UserRole.employee) => {
  userSequence += 1
  return prisma.user.create({
    data: {
      email: `char-user-${userSequence}@example.com`,
      password: 'password123',
      role,
    },
  })
}

const authHeaders = (token: string) => ({
  authorization: `Bearer ${token}`,
})

describe('Characterization for uncovered routes', () => {
  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.feedback.deleteMany()
    await prisma.job.deleteMany()
    await prisma.message.deleteMany()
    await prisma.companyRoomLink.deleteMany()
    await prisma.chatworkRoom.deleteMany()
    await prisma.task.deleteMany()
    await prisma.summary.deleteMany()
    await prisma.wholesale.deleteMany()
    await prisma.project.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.company.deleteMany()
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'char-user-',
        },
      },
    })
    await fastify.close()
  })

  it('dashboard returns date buckets and unassigned message count', async () => {
    const user = await createUser(UserRole.admin)
    const token = fastify.jwt.sign({ userId: user.id, role: 'admin' })
    const company = await prisma.company.create({
      data: {
        name: 'Dashboard Co',
        normalizedName: 'dashboardco',
        status: 'active',
        tags: [],
      },
    })
    const room = await prisma.chatworkRoom.create({
      data: {
        roomId: 'dashboard-room-1',
        name: 'Dashboard Room',
      },
    })

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
    const startOfThreeDays = new Date(startOfToday)
    startOfThreeDays.setDate(startOfThreeDays.getDate() + 3)
    const startOfSevenDays = new Date(startOfToday)
    startOfSevenDays.setDate(startOfSevenDays.getDate() + 7)

    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Overdue task',
        status: 'todo',
        dueDate: new Date(startOfToday.getTime() - 1000),
      },
    })
    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Today task',
        status: 'todo',
        dueDate: new Date(startOfToday.getTime() + 3600 * 1000),
      },
    })
    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Soon task',
        status: 'todo',
        dueDate: new Date(startOfTomorrow.getTime() + 3600 * 1000),
      },
    })
    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Week task',
        status: 'todo',
        dueDate: new Date(startOfThreeDays.getTime() + 3600 * 1000),
      },
    })
    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Done task',
        status: 'done',
        dueDate: new Date(startOfToday.getTime() - 1000),
      },
    })

    await prisma.summary.create({
      data: {
        companyId: company.id,
        periodStart: startOfToday,
        periodEnd: startOfSevenDays,
        content: 'summary',
        type: 'manual',
        sourceLinks: [],
      },
    })

    await prisma.message.create({
      data: {
        chatworkRoomId: room.id,
        roomId: room.roomId,
        messageId: 'dashboard-message-1',
        sender: 'sender',
        body: 'unassigned',
        sentAt: new Date(),
      },
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/dashboard',
      headers: authHeaders(token),
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.overdueTasks).toHaveLength(1)
    expect(body.todayTasks).toHaveLength(1)
    expect(body.soonTasks).toHaveLength(1)
    expect(body.weekTasks).toHaveLength(1)
    expect(body.latestSummaries).toHaveLength(1)
    expect(body.recentCompanies).toHaveLength(1)
    expect(body.unassignedMessageCount).toBe(1)
    expect(typeof body.overdueTasks[0].createdAt).toBe('string')
    expect(typeof body.latestSummaries[0].createdAt).toBe('string')
  })

  it('feedback create/list/patch preserve current auth and validation behavior', async () => {
    const owner = await createUser(UserRole.employee)
    const other = await createUser(UserRole.employee)
    const ownerToken = fastify.jwt.sign({ userId: owner.id, role: 'employee' })
    const otherToken = fastify.jwt.sign({ userId: other.id, role: 'employee' })

    const unauthorized = await fastify.inject({
      method: 'POST',
      url: '/api/feedback',
      payload: {
        message: 'no auth',
      },
    })
    expect(unauthorized.statusCode).toBe(401)

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/feedback',
      headers: authHeaders(ownerToken),
      payload: {
        title: '  title  ',
        message: '  message body  ',
        pageUrl: '  https://example.com/path  ',
      },
    })
    expect(createResponse.statusCode).toBe(201)
    const createdFeedback = JSON.parse(createResponse.body).feedback
    expect(createdFeedback.type).toBe(FeedbackType.improvement)
    expect(createdFeedback.title).toBe('title')
    expect(createdFeedback.message).toBe('message body')
    expect(createdFeedback.pageUrl).toBe('https://example.com/path')

    const listResponse = await fastify.inject({
      method: 'GET',
      url: '/api/feedback?type=improvement',
      headers: authHeaders(ownerToken),
    })
    expect(listResponse.statusCode).toBe(200)
    const listBody = JSON.parse(listResponse.body)
    expect(listBody.feedbacks).toHaveLength(1)
    expect(listBody.feedbacks[0].user.id).toBe(owner.id)

    const forbiddenPatch = await fastify.inject({
      method: 'PATCH',
      url: `/api/feedback/${createdFeedback.id}`,
      headers: authHeaders(otherToken),
      payload: {
        message: 'updated by other',
      },
    })
    expect(forbiddenPatch.statusCode).toBe(403)

    const bugFeedback = await prisma.feedback.create({
      data: {
        userId: owner.id,
        type: FeedbackType.bug,
        message: 'bug report',
      },
    })
    const invalidPatch = await fastify.inject({
      method: 'PATCH',
      url: `/api/feedback/${bugFeedback.id}`,
      headers: authHeaders(ownerToken),
      payload: {
        message: 'cannot update',
      },
    })
    expect(invalidPatch.statusCode).toBe(400)
    const invalidPatchBody = JSON.parse(invalidPatch.body)
    expect(invalidPatchBody.error.message).toBe('only improvement feedback can be edited')
  })

  it('jobs list/get/cancel preserve visibility and terminal-status behavior', async () => {
    const owner = await createUser(UserRole.employee)
    const other = await createUser(UserRole.employee)
    const admin = await createUser(UserRole.admin)

    const ownerToken = fastify.jwt.sign({ userId: owner.id, role: 'employee' })
    const otherToken = fastify.jwt.sign({ userId: other.id, role: 'employee' })
    const adminToken = fastify.jwt.sign({ userId: admin.id, role: 'admin' })

    const ownerJob = await prisma.job.create({
      data: {
        type: JobType.chatwork_rooms_sync,
        status: JobStatus.failed,
        payload: {},
        error: {
          name: 'SyncError',
          message: 'failed to sync',
          stack: 'sensitive stack',
        },
        userId: owner.id,
      },
    })
    const otherJob = await prisma.job.create({
      data: {
        type: JobType.chatwork_messages_sync,
        status: JobStatus.queued,
        payload: {},
        userId: other.id,
      },
    })

    const listOwnerResponse = await fastify.inject({
      method: 'GET',
      url: '/api/jobs',
      headers: authHeaders(ownerToken),
    })
    expect(listOwnerResponse.statusCode).toBe(200)
    const ownerBody = JSON.parse(listOwnerResponse.body)
    expect(ownerBody.jobs).toHaveLength(1)
    expect(ownerBody.jobs[0].id).toBe(ownerJob.id)
    expect(ownerBody.jobs[0].error).toEqual({
      name: 'SyncError',
      message: 'failed to sync',
    })

    const listAdminResponse = await fastify.inject({
      method: 'GET',
      url: '/api/jobs',
      headers: authHeaders(adminToken),
    })
    expect(listAdminResponse.statusCode).toBe(200)
    const adminBody = JSON.parse(listAdminResponse.body)
    expect(adminBody.jobs).toHaveLength(2)
    const adminOwnerJob = adminBody.jobs.find((job: { id: string }) => job.id === ownerJob.id)
    expect(adminOwnerJob.error.stack).toBe('sensitive stack')

    const forbiddenGet = await fastify.inject({
      method: 'GET',
      url: `/api/jobs/${ownerJob.id}`,
      headers: authHeaders(otherToken),
    })
    expect(forbiddenGet.statusCode).toBe(403)

    const terminalJob = await prisma.job.create({
      data: {
        type: JobType.chatwork_rooms_sync,
        status: JobStatus.completed,
        payload: {},
        userId: owner.id,
      },
    })
    const terminalCancel = await fastify.inject({
      method: 'POST',
      url: `/api/jobs/${terminalJob.id}/cancel`,
      headers: authHeaders(ownerToken),
    })
    expect(terminalCancel.statusCode).toBe(400)
    expect(JSON.parse(terminalCancel.body).error).toBe('Job already finished')

    const queueCancel = await fastify.inject({
      method: 'POST',
      url: `/api/jobs/${otherJob.id}/cancel`,
      headers: authHeaders(otherToken),
    })
    expect(queueCancel.statusCode).toBe(200)
    const queueCancelBody = JSON.parse(queueCancel.body)
    expect(queueCancelBody.job.status).toBe(JobStatus.canceled)
  })

  it('search requires auth and returns all target entities with trimmed query', async () => {
    const admin = await createUser(UserRole.admin)
    const token = fastify.jwt.sign({ userId: admin.id, role: 'admin' })

    const company = await prisma.company.create({
      data: {
        name: 'Acme Holdings',
        normalizedName: 'acmeholdings',
        status: 'active',
        tags: [],
      },
    })
    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Acme Project',
        status: 'active',
      },
    })
    await prisma.wholesale.create({
      data: {
        projectId: project.id,
        companyId: company.id,
        status: WholesaleStatus.active,
      },
    })
    await prisma.task.create({
      data: {
        targetType: 'company',
        targetId: company.id,
        title: 'Call Acme',
        status: 'todo',
      },
    })
    await prisma.contact.create({
      data: {
        companyId: company.id,
        name: 'Acme Contact',
      },
    })

    const unauthorized = await fastify.inject({
      method: 'GET',
      url: '/api/search?q=Acme',
    })
    expect(unauthorized.statusCode).toBe(401)

    const invalid = await fastify.inject({
      method: 'GET',
      url: '/api/search?q=',
      headers: authHeaders(token),
    })
    expect(invalid.statusCode).toBe(400)

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/search?q=%20Acme%20&limit=3',
      headers: authHeaders(token),
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.query).toBe('Acme')
    expect(body.companies).toHaveLength(1)
    expect(body.projects).toHaveLength(1)
    expect(body.wholesales).toHaveLength(1)
    expect(body.tasks).toHaveLength(1)
    expect(body.contacts).toHaveLength(1)
  })

  it('wholesales create/list/update/delete keep current validation and payload shape', async () => {
    const employee = await createUser(UserRole.employee)
    const token = fastify.jwt.sign({ userId: employee.id, role: 'employee' })

    const company = await prisma.company.create({
      data: {
        name: 'Wholesale Co',
        normalizedName: 'wholesaleco',
        status: 'active',
        tags: [],
      },
    })
    const project = await prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Wholesale Project',
        status: 'active',
      },
    })

    const invalidStatus = await fastify.inject({
      method: 'GET',
      url: '/api/wholesales?status=invalid',
      headers: authHeaders(token),
    })
    expect(invalidStatus.statusCode).toBe(400)

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/wholesales',
      headers: authHeaders(token),
      payload: {
        projectId: project.id,
        companyId: company.id,
        conditions: 'net 30',
        unitPrice: 123000,
        margin: 0.15,
        status: WholesaleStatus.active,
      },
    })
    expect(createResponse.statusCode).toBe(201)
    const created = JSON.parse(createResponse.body).wholesale

    const listResponse = await fastify.inject({
      method: 'GET',
      url: `/api/wholesales?companyId=${company.id}`,
      headers: authHeaders(token),
    })
    expect(listResponse.statusCode).toBe(200)
    const listBody = JSON.parse(listResponse.body)
    expect(listBody.items).toHaveLength(1)
    expect(listBody.items[0].id).toBe(created.id)

    const companyListResponse = await fastify.inject({
      method: 'GET',
      url: `/api/companies/${company.id}/wholesales`,
      headers: authHeaders(token),
    })
    expect(companyListResponse.statusCode).toBe(200)
    const companyListBody = JSON.parse(companyListResponse.body)
    expect(companyListBody.wholesales).toHaveLength(1)

    const invalidOwnerPatch = await fastify.inject({
      method: 'PATCH',
      url: `/api/wholesales/${created.id}`,
      headers: authHeaders(token),
      payload: {
        ownerId: '   ',
      },
    })
    expect(invalidOwnerPatch.statusCode).toBe(400)
    expect(JSON.parse(invalidOwnerPatch.body).error.message).toBe('Invalid ownerId')

    const deleteResponse = await fastify.inject({
      method: 'DELETE',
      url: `/api/wholesales/${created.id}`,
      headers: authHeaders(token),
    })
    expect(deleteResponse.statusCode).toBe(204)

    const getDeletedResponse = await fastify.inject({
      method: 'GET',
      url: `/api/wholesales/${created.id}`,
      headers: authHeaders(token),
    })
    expect(getDeletedResponse.statusCode).toBe(404)
  })
})
