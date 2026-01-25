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

  it('should return 401 when role is missing', async () => {
    const token = fastify.jwt.sign({ userId: '123' })

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

    expect(response.statusCode).toBe(401)
  })

  it('should return 401 with invalid role', async () => {
    const token = fastify.jwt.sign({ userId: '123', role: 'invalid-role' })

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

    expect(response.statusCode).toBe(401)
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

  it('should deny employee access to admin-only route', async () => {
    const employeeToken = fastify.jwt.sign({ userId: '123', role: 'employee' })

    fastify.get('/admin', { preHandler: requireAdmin() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/admin',
      headers: {
        authorization: `Bearer ${employeeToken}`,
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it('should allow write access for employee role', async () => {
    const employeeToken = fastify.jwt.sign({ userId: '123', role: 'employee' })

    fastify.post('/write', { preHandler: requireWriteAccess() }, async () => {
      return { message: 'ok' }
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/write',
      headers: {
        authorization: `Bearer ${employeeToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
  })
})
