import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { requireAuth, requireAdmin, requireWriteAccess } from './rbac'

describe('RBAC middleware', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = Fastify()
    await fastify.register(jwt, {
      secret: process.env.JWT_SECRET || 'test-secret',
    })
  })

  afterEach(async () => {
    await fastify.close()
  })

  it('should allow access with valid token', async () => {
    const token = fastify.jwt.sign({ userId: '123', role: 'admin' })

    fastify.get('/protected', { preHandler: requireAuth() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
  })

  it('should return 401 without token', async () => {
    fastify.get('/protected', { preHandler: requireAuth() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
    })

    expect(response.statusCode).toBe(401)
  })

  it('should allow admin access to admin-only route', async () => {
    const adminToken = fastify.jwt.sign({ userId: '123', role: 'admin' })

    fastify.get('/admin', { preHandler: requireAdmin() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/admin',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
  })

  it('should deny readonly access to admin-only route', async () => {
    const readonlyToken = fastify.jwt.sign({ userId: '123', role: 'readonly' })

    fastify.get('/admin', { preHandler: requireAdmin() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/admin',
      headers: {
        authorization: `Bearer ${readonlyToken}`,
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('should allow write access for sales role', async () => {
    const salesToken = fastify.jwt.sign({ userId: '123', role: 'sales' })

    fastify.post('/write', { preHandler: requireWriteAccess() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/write',
      headers: {
        authorization: `Bearer ${salesToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
  })

  it('should deny write access for readonly role', async () => {
    const readonlyToken = fastify.jwt.sign({ userId: '123', role: 'readonly' })

    fastify.post('/write', { preHandler: requireWriteAccess() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/write',
      headers: {
        authorization: `Bearer ${readonlyToken}`,
      },
    })

    expect(response.statusCode).toBe(403)
  })
})
