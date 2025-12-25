import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { companyRoutes } from './routes/companies'
import { chatworkRoutes } from './routes/chatwork'
import { messageRoutes } from './routes/messages'

dotenv.config()

const fastify = Fastify({
  logger: true,
})

// CORS設定
fastify.register(cors, {
  origin: true,
  credentials: true,
})

// Cookie設定
fastify.register(cookie)

// JWT設定
fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  cookie: {
    cookieName: 'token',
    signed: false,
  },
})

// ルート登録
fastify.register(authRoutes, { prefix: '/api' })
fastify.register(userRoutes, { prefix: '/api' })
fastify.register(companyRoutes, { prefix: '/api' })
fastify.register(chatworkRoutes, { prefix: '/api' })
fastify.register(messageRoutes, { prefix: '/api' })

// ヘルスチェックエンドポイント
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
