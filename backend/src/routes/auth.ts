import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { JWTUser } from '../types/auth'
import { env } from '../config/env'
import { buildErrorPayload } from '../utils/errors'
import { prisma } from '../utils/prisma'

interface LoginBody {
  email: string
  password: string
}

export async function authRoutes(fastify: FastifyInstance) {
  // ログイン
  fastify.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: env.rateLimitMax,
          timeWindow: env.rateLimitWindowMs,
        },
      },
    },
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { email, password } = request.body

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        return reply.code(401).send(buildErrorPayload(401, 'Invalid credentials'))
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return reply.code(401).send(buildErrorPayload(401, 'Invalid credentials'))
      }

      const token = fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '7d' })
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      }
    }
  )

  // ログアウト
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    void request
    reply.clearCookie('token', {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    })
    return { message: 'Logged out' }
  })

  // 現在のユーザー情報取得
  fastify.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const { userId } = request.user as JWTUser

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      })

      if (!user) {
        return reply.code(404).send(buildErrorPayload(404, 'User not found'))
      }

      return { user }
    } catch (err) {
      return reply.code(401).send(buildErrorPayload(401, 'Unauthorized'))
    }
  })
}
