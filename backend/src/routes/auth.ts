import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

interface LoginBody {
  email: string
  password: string
}

interface JWTUser {
  userId: string
  role: string
}

export async function authRoutes(fastify: FastifyInstance) {
  // ログイン
  fastify.post<{ Body: LoginBody }>(
    '/auth/login',
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { email, password } = request.body

      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const token = fastify.jwt.sign({ userId: user.id, role: user.role })
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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
    reply.clearCookie('token', { path: '/' })
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
        return reply.code(404).send({ error: 'User not found' })
      }

      return { user }
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}
