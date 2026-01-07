import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { randomUUID } from 'node:crypto'
import {
  ZodTypeProvider,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { registerRoutes } from './routes'
import { env } from './config/env'
import { normalizeErrorPayload } from './utils/errors'
import { JWTUser } from './types/auth'
import { initJobQueue } from './services/jobQueue'

const fastify = Fastify({
  logger: true,
  trustProxy: env.trustProxy,
  genReqId: (req) => {
    const headerId = req.headers['x-request-id']
    if (typeof headerId === 'string' && headerId.trim() !== '') {
      return headerId
    }
    return randomUUID()
  },
})

fastify.register(cors, {
  origin: env.corsOrigins.length
    ? (origin, callback) => {
        if (!origin) return callback(null, true)
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('CORS origin not allowed'), false)
      }
    : env.nodeEnv === 'production'
      ? false
      : true,
  credentials: true,
}).withTypeProvider<ZodTypeProvider>()

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

fastify.register(cookie)

fastify.register(jwt, {
  secret: env.jwtSecret || 'change-this-secret-in-production',
  cookie: {
    cookieName: 'token',
    signed: false,
  },
})

fastify.register(rateLimit, {
  global: false,
  max: env.rateLimitMax,
  timeWindow: env.rateLimitWindowMs,
})

fastify.register(swagger, {
  openapi: {
    info: {
      title: 'CWLLM API',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

fastify.register(swaggerUi, {
  routePrefix: '/api/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
})

fastify.addHook('onRequest', async (request, reply) => {
  reply.header('x-request-id', request.id)
})

fastify.addHook('onResponse', async (request, reply) => {
  const user = request.user as JWTUser | undefined
  request.log.info(
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      userId: user?.userId,
      role: user?.role,
    },
    'request completed'
  )
})

fastify.setErrorHandler((error, request, reply) => {
  const user = request.user as JWTUser | undefined
  const statusCode = error.statusCode ?? 500
  request.log.error(
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode,
      userId: user?.userId,
      role: user?.role,
      err: error,
    },
    'request failed'
  )
  reply
    .code(statusCode)
    .send(
      normalizeErrorPayload({ error: error.message || 'Internal server error' }, statusCode)
    )
})

fastify.addHook('preSerialization', async (_request, reply, payload) => {
  if (!payload || typeof payload !== 'object') return payload
  return normalizeErrorPayload(payload, reply.statusCode)
})

registerRoutes(fastify)

initJobQueue(fastify.log, { enableWorker: env.jobWorkerEnabled, enableQueue: true })

fastify.get('/healthz', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    await fastify.listen({ port: env.port, host: '0.0.0.0' })
    console.log(`Server listening on http://localhost:${env.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
