import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { authRoutes } from './auth'
import { requireAuth } from '../middleware/rbac'

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
  await app.register(authRoutes, { prefix: '/api' })

  app.get('/api/protected', { preHandler: requireAuth() }, async () => {
    return { message: 'ok' }
  })

  return app
}

describe('Auth endpoints', () => {
  let fastify: FastifyInstance

  beforeEach(async () => {
    fastify = await buildTestServer()
  })

  afterEach(async () => {
    await fastify.close()
  })

  it('should login with valid credentials', async () => {
    // テストユーザーを作成
    const hashedPassword = await bcrypt.hash('password123', 10)
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        role: 'admin',
      },
    })

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.user.email).toBe('test@example.com')
    expect(body.user.role).toBe('admin')

    // クリーンアップ
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  it('should return 401 with invalid credentials', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    })

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body)
    const message =
      typeof body.error === 'string' ? body.error : body.error?.message
    expect(message).toBe('Invalid credentials')
  })

  it('should logout successfully', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/api/auth/logout',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.message).toBe('Logged out')
  })

  it('should return user info for authenticated request', async () => {
    // テストユーザーを作成
    const hashedPassword = await bcrypt.hash('password123', 10)
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        role: 'admin',
      },
    })

    const token = fastify.jwt.sign({ userId: testUser.id, role: testUser.role })

    const response = await fastify.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.user.email).toBe('test@example.com')

    // クリーンアップ
    await prisma.user.delete({ where: { id: testUser.id } })
  })

  it('should return 401 for unauthenticated request', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/api/auth/me',
    })

    expect(response.statusCode).toBe(401)
  })

  it('should allow cookie-authenticated access to protected route', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10)
    const testUser = await prisma.user.create({
      data: {
        email: 'cookie@example.com',
        password: hashedPassword,
        role: 'admin',
      },
    })

    const loginResponse = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'cookie@example.com',
        password: 'password123',
      },
    })

    const setCookie = loginResponse.headers['set-cookie']
    const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
    const tokenCookie = rawCookie?.split(';')[0]
    if (!tokenCookie) {
      throw new Error('Auth cookie was not set')
    }

    const protectedResponse = await fastify.inject({
      method: 'GET',
      url: '/api/protected',
      headers: {
        cookie: tokenCookie,
      },
    })

    expect(protectedResponse.statusCode).toBe(200)

    await prisma.user.delete({ where: { id: testUser.id } })
  })
})
