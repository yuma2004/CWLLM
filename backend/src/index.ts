import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerRoutes } from './routes'
import { JWTUser } from './types/auth'

// .envファイルを読み込む（backend/.envを優先、なければルートの.env）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// まずbackend/.envを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env') })
// ルートの.envも読み込む（未設定の変数のみ）
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const fastify = Fastify({
  logger: true,
  genReqId: (req) => {
    const headerId = req.headers['x-request-id']
    if (typeof headerId === 'string' && headerId.trim() !== '') {
      return headerId
    }
    return randomUUID()
  },
})

fastify.register(cors, {
  origin: true,
  credentials: true,
})

fastify.register(cookie)

fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  cookie: {
    cookieName: 'token',
    signed: false,
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
  reply.code(statusCode).send({ error: 'Internal server error' })
})

registerRoutes(fastify)

fastify.get('/healthz', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    const port = Number(process.env.BACKEND_PORT) || 3000
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`Server listening on http://localhost:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
