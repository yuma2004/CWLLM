import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { JWTUser } from '../types/auth'
import { buildErrorPayload, prisma } from '../utils'
import type { LoginBody } from './auth.schemas'

export const buildLoginHandler =
  (fastify: FastifyInstance) =>
  async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
    const startedAt = Date.now()
    let dbMs: number | null = null
    let bcryptMs: number | null = null
    let userFound = false

    const logTiming = (statusCode: number) => {
      const totalMs = Date.now() - startedAt
      request.log.info(
        {
          event: 'auth.login',
          statusCode,
          dbMs,
          bcryptMs,
          totalMs,
          userFound,
          requestId: request.id,
        },
        'auth.login timing'
      )
    }

    const { email, password } = request.body
    const normalizedEmail = email.trim()

    const dbStart = Date.now()
    const user =
      (await prisma.user.findUnique({ where: { email: normalizedEmail } })) ??
      (await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      }))
    dbMs = Date.now() - dbStart

    if (!user) {
      logTiming(401)
      return reply.code(401).send(buildErrorPayload(401, 'Invalid credentials'))
    }
    userFound = true

    const bcryptStart = Date.now()
    const isValid = await bcrypt.compare(password, user.password)
    bcryptMs = Date.now() - bcryptStart

    if (!isValid) {
      logTiming(401)
      return reply.code(401).send(buildErrorPayload(401, 'Invalid credentials'))
    }

    const token = fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: '7d' })
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    })

    logTiming(200)

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }
  }

export const logoutHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  void request
  reply.clearCookie('token', {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  })
  return { message: 'Logged out' }
}

export const meHandler = async (request: FastifyRequest, reply: FastifyReply) => {
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
}
