import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { requireAdmin, requireAuth } from '../middleware/rbac'
import { buildErrorPayload } from '../utils/errors'
import { prisma } from '../utils/prisma'
import { getCache, setCache } from '../utils/ttlCache'
import { validatePassword } from '../utils/validation'

interface CreateUserBody {
  email: string
  password: string
  role: UserRole
}

interface UpdateUserRoleBody {
  role: UserRole
}

const USER_OPTIONS_CACHE_TTL_MS = 30_000

export async function userRoutes(fastify: FastifyInstance) {
  // ユーザー作成（Adminのみ）
  fastify.post<{ Body: CreateUserBody }>(
    '/users',
    { preHandler: requireAdmin() },
    async (request: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply) => {
      const { email, password, role } = request.body

      // バリデーション
      const validRoles = new Set(Object.values(UserRole))
      if (!validRoles.has(role)) {
        return reply.code(400).send(buildErrorPayload(400, 'Invalid role'))
      }
      const passwordCheck = validatePassword(password)
      if (!passwordCheck.ok) {
        const reason = passwordCheck.reason ?? 'Invalid password'
        return reply.code(400).send(buildErrorPayload(400, reason))
      }

      // 既存ユーザーチェック
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return reply.code(409).send(buildErrorPayload(409, 'User already exists'))
      }

      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      return reply.code(201).send({ user })
    }
  )

  // ユーザー一覧（Adminのみ）
  fastify.get(
    '/users',
    { preHandler: requireAdmin() },
    async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return { users }
    }
  )

  fastify.get(
    '/users/options',
    { preHandler: requireAuth() },
    async () => {
      const cacheKey = 'users:options'
      const cached = getCache<{ users: Array<{ id: string; email: string; role: UserRole }> }>(
        cacheKey
      )
      if (cached) {
        return cached
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      const response = { users }
      setCache(cacheKey, response, USER_OPTIONS_CACHE_TTL_MS)

      return response
    }
  )

  // ロール変更（Adminのみ）
  fastify.patch<{ Params: { id: string }; Body: UpdateUserRoleBody }>(
    '/users/:id/role',
    { preHandler: requireAdmin() },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserRoleBody }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params
      const { role } = request.body

      // バリデーション
      const validRoles = new Set(Object.values(UserRole))
      if (!validRoles.has(role)) {
        return reply.code(400).send(buildErrorPayload(400, 'Invalid role'))
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          role: true,
        },
      })

      return { user }
    }
  )
}
