import { FastifyReply, FastifyRequest } from 'fastify'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  CACHE_KEYS,
  CACHE_TTLS_MS,
  buildErrorPayload,
  deleteCache,
  getCache,
  handlePrismaError,
  prisma,
  setCache,
  validatePassword,
} from '../utils'
import type { CreateUserBody, UpdateUserRoleBody } from './users.schemas'

export const createUserHandler = async (
  request: FastifyRequest<{ Body: CreateUserBody }>,
  reply: FastifyReply
) => {
  const { email, name, password, role } = request.body
  const normalizedEmail = email.trim()
  const normalizedName = name.trim()

  const validRoles = new Set(Object.values(UserRole))
  if (!validRoles.has(role)) {
    return reply.code(400).send(buildErrorPayload(400, 'Invalid role'))
  }
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.ok) {
    const reason = passwordCheck.reason ?? 'Invalid password'
    return reply.code(400).send(buildErrorPayload(400, reason))
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedName,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })
    deleteCache(CACHE_KEYS.userOptions)

    return reply.code(201).send({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
    })
  } catch (error) {
    return handlePrismaError(reply, error, {
      P2002: { status: 409, message: 'User already exists' },
    })
  }
}

export const listUsersHandler = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
  }
}

export const listUserOptionsHandler = async () => {
  const cacheKey = CACHE_KEYS.userOptions
  const cached = getCache<{
    users: Array<{ id: string; email: string; name?: string | null; role: UserRole }>
  }>(cacheKey)
  if (cached) {
    return cached
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const response = { users }
  setCache(cacheKey, response, CACHE_TTLS_MS.userOptions)

  return response
}

export const updateUserRoleHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserRoleBody }>,
  reply: FastifyReply
) => {
  const { id } = request.params
  const { role } = request.body

  const validRoles = new Set(Object.values(UserRole))
  if (!validRoles.has(role)) {
    return reply.code(400).send(buildErrorPayload(400, 'Invalid role'))
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })
    deleteCache(CACHE_KEYS.userOptions)

    return { user }
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}
