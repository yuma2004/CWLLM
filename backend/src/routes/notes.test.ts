import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import bcrypt from 'bcryptjs'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient, UserRole } from '@prisma/client'
import { registerRoutes } from './index'

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
  registerRoutes(app)
  return app
}

const createUser = async (email: string, role: UserRole = UserRole.employee) => {
  const hashedPassword = await bcrypt.hash('password123', 10)
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
    },
  })
}

describe('Note endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await prisma.task.deleteMany()
    await prisma.wholesale.deleteMany()
    await prisma.project.deleteMany()
    await prisma.company.deleteMany()
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'note-test-' },
      },
    })
    await fastify.close()
  })

  it('creates/updates/lists/deletes notes and converts a note into a task', async () => {
    const owner = await createUser(`note-test-owner-${Date.now()}@example.com`)
    const token = fastify.jwt.sign({ userId: owner.id, role: 'employee' })

    const advertiser = await prisma.company.create({
      data: {
        name: 'Note Advertiser',
        normalizedName: `note-advertiser-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    const media = await prisma.company.create({
      data: {
        name: 'Note Media',
        normalizedName: `note-media-${Date.now()}`,
        status: 'active',
        tags: [],
      },
    })
    const project = await prisma.project.create({
      data: {
        companyId: advertiser.id,
        name: 'Note Project',
        status: 'active',
      },
    })
    const wholesale = await prisma.wholesale.create({
      data: {
        projectId: project.id,
        companyId: media.id,
      },
    })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/notes',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        targetType: 'wholesale',
        targetId: wholesale.id,
        type: 'negotiation',
        content: 'first memo for this deal',
      },
    })
    expect(createResponse.statusCode).toBe(201)
    const createdNote = JSON.parse(createResponse.body).note

    const listResponse = await fastify.inject({
      method: 'GET',
      url: `/api/notes?targetType=wholesale&targetId=${wholesale.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(listResponse.statusCode).toBe(200)
    const listBody = JSON.parse(listResponse.body)
    expect(listBody.items).toHaveLength(1)
    expect(listBody.items[0].id).toBe(createdNote.id)

    const updateResponse = await fastify.inject({
      method: 'PATCH',
      url: `/api/notes/${createdNote.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        content: 'updated memo',
        type: 'report',
      },
    })
    expect(updateResponse.statusCode).toBe(200)
    const updatedNote = JSON.parse(updateResponse.body).note
    expect(updatedNote.content).toBe('updated memo')
    expect(updatedNote.type).toBe('report')

    const createTaskResponse = await fastify.inject({
      method: 'POST',
      url: `/api/notes/${createdNote.id}/tasks`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        title: 'Follow up from note',
        status: 'todo',
      },
    })
    expect(createTaskResponse.statusCode).toBe(201)
    const task = JSON.parse(createTaskResponse.body).task
    expect(task.targetType).toBe('wholesale')
    expect(task.targetId).toBe(wholesale.id)
    expect(task.title).toBe('Follow up from note')

    const deleteResponse = await fastify.inject({
      method: 'DELETE',
      url: `/api/notes/${createdNote.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(deleteResponse.statusCode).toBe(204)

    const getDeletedResponse = await fastify.inject({
      method: 'GET',
      url: `/api/notes/${createdNote.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(getDeletedResponse.statusCode).toBe(404)
  })

  it('rejects note creation when target does not exist', async () => {
    const owner = await createUser(`note-test-missing-${Date.now()}@example.com`)
    const token = fastify.jwt.sign({ userId: owner.id, role: 'employee' })

    const createResponse = await fastify.inject({
      method: 'POST',
      url: '/api/notes',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        targetType: 'wholesale',
        targetId: 'missing-wholesale-id',
        type: 'request',
        content: 'target missing',
      },
    })

    expect(createResponse.statusCode).toBe(404)
    expect(JSON.parse(createResponse.body).error.message).toBe('Target not found')
  })
})
