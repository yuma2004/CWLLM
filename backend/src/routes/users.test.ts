import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient } from '@prisma/client'
import { userRoutes } from './users'

const prisma = new PrismaClient()

const buildTestServer = async () => {
  const app = Fastify()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret',
  })
  await app.register(userRoutes, { prefix: '/api' })
  return app
}

describe('User endpoints', () => {
  let fastify: FastifyInstance
  let adminId: string
  let adminToken: string

  beforeEach(async () => {
    fastify = await buildTestServer()
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@example.com`,
        password: 'password',
        role: 'admin',
      },
    })
    adminId = admin.id
    adminToken = fastify.jwt.sign({ userId: adminId, role: 'admin' })
  })

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { startsWith: 'admin-' } },
          { email: 'duplicate@example.com' },
          { email: 'new-user@example.com' },
        ],
      },
    })
    await fastify.close()
  })

  it('returns 409 for duplicate email', async () => {
    await prisma.user.create({
      data: {
        email: 'duplicate@example.com',
        password: 'password',
        role: 'sales',
      },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/users',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        email: 'duplicate@example.com',
        password: 'password123',
        role: 'sales',
      },
    })

    expect(response.statusCode).toBe(409)
  })

  it('returns 404 when updating missing user', async () => {
    const response = await fastify.inject({
      method: 'PATCH',
      url: '/api/users/nonexistent-user/role',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        role: 'sales',
      },
    })

    expect(response.statusCode).toBe(404)
  })

  it('refreshes options cache after create and update', async () => {
    const optionsBefore = await fastify.inject({
      method: 'GET',
      url: '/api/users/options',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(optionsBefore.statusCode).toBe(200)

    await fastify.inject({
      method: 'POST',
      url: '/api/users',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        email: 'new-user@example.com',
        password: 'password123',
        role: 'sales',
      },
    })

    const optionsAfterCreate = await fastify.inject({
      method: 'GET',
      url: '/api/users/options',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    const bodyAfterCreate = JSON.parse(optionsAfterCreate.body)
    const hasNewUser = bodyAfterCreate.users.some(
      (user: { email: string }) => user.email === 'new-user@example.com'
    )
    expect(hasNewUser).toBe(true)

    const createdUser = await prisma.user.findUnique({
      where: { email: 'new-user@example.com' },
    })

    if (!createdUser) {
      throw new Error('Expected created user to exist')
    }

    await fastify.inject({
      method: 'PATCH',
      url: `/api/users/${createdUser.id}/role`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        role: 'ops',
      },
    })

    const optionsAfterUpdate = await fastify.inject({
      method: 'GET',
      url: '/api/users/options',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    const bodyAfterUpdate = JSON.parse(optionsAfterUpdate.body)
    const updatedUser = bodyAfterUpdate.users.find(
      (user: { email: string }) => user.email === 'new-user@example.com'
    )

    expect(updatedUser?.role).toBe('ops')
  })
})
