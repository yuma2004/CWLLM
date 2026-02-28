import { PrismaClient } from '@prisma/client'
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

const prisma = new PrismaClient()

const managedKeys = [
  'NODE_ENV',
  'BACKEND_PORT',
  'PORT',
  'JWT_SECRET',
  'CHATWORK_API_TOKEN',
  'CHATWORK_API_BASE_URL',
  'CHATWORK_WEBHOOK_TOKEN',
  'REDIS_URL',
  'JOB_WORKER_ENABLED',
] as const

type ManagedKey = (typeof managedKeys)[number]
type ManagedOverrides = Partial<Record<ManagedKey, string | undefined>>

const originalEnv: Record<ManagedKey, string | undefined> = managedKeys.reduce(
  (acc, key) => ({
    ...acc,
    [key]: process.env[key],
  }),
  {} as Record<ManagedKey, string | undefined>
)

const restoreManagedEnv = () => {
  for (const key of managedKeys) {
    const value = originalEnv[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

const applyManagedEnv = (overrides: ManagedOverrides) => {
  for (const key of managedKeys) {
    if (!Object.prototype.hasOwnProperty.call(overrides, key)) continue
    const value = overrides[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

const loadChatworkRoutes = async (overrides: ManagedOverrides = {}) => {
  restoreManagedEnv()
  applyManagedEnv(overrides)
  vi.resetModules()
  const module = await import('./chatwork')
  return module.chatworkRoutes
}

const buildTestServer = async (
  routes: (fastify: FastifyInstance) => Promise<void>
) => {
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
  await app.register(routes, { prefix: '/api' })
  return app
}

const cleanupDatabase = async () => {
  await prisma.job.deleteMany()
  await prisma.message.deleteMany()
  await prisma.companyRoomLink.deleteMany()
  await prisma.chatworkRoom.deleteMany()
  await prisma.company.deleteMany()
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'chatwork-webhook-test-',
      },
    },
  })
}

describe('Chatwork webhook and token-dependent routes', () => {
  afterEach(async () => {
    await cleanupDatabase()
    restoreManagedEnv()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('webhook signature tokenが設定されている場合、署名なしリクエストを拒否する', async () => {
    const routes = await loadChatworkRoutes({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: 'token',
      CHATWORK_WEBHOOK_TOKEN: Buffer.from('webhook-secret').toString('base64'),
      REDIS_URL: undefined,
    })

    const app = await buildTestServer(routes)
    try {
      await prisma.chatworkRoom.create({
        data: {
          roomId: 'signature-room-1',
          name: 'Signature Room',
          isActive: true,
        },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/chatwork/webhook',
        payload: {
          webhook_event_type: 'message_created',
          webhook_event: {
            room_id: 'signature-room-1',
          },
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('UNAUTHORIZED')
    } finally {
      await app.close()
    }
  })

  it('CHATWORK_API_TOKEN未設定時は同期エンドポイントが400を返す', async () => {
    const routes = await loadChatworkRoutes({
      NODE_ENV: 'test',
      CHATWORK_API_TOKEN: '',
      CHATWORK_WEBHOOK_TOKEN: undefined,
      REDIS_URL: undefined,
    })

    const app = await buildTestServer(routes)
    try {
      const user = await prisma.user.create({
        data: {
          email: `chatwork-webhook-test-${Date.now()}@example.com`,
          password: 'password',
          role: 'admin',
        },
      })
      const token = app.jwt.sign({ userId: user.id, role: 'admin' })

      const roomSync = await app.inject({
        method: 'POST',
        url: '/api/chatwork/rooms/sync',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
      expect(roomSync.statusCode).toBe(400)

      const messageSync = await app.inject({
        method: 'POST',
        url: '/api/chatwork/messages/sync',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
      expect(messageSync.statusCode).toBe(400)
    } finally {
      await app.close()
    }
  })
})
