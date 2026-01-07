import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import { requireAdmin, requireAuth } from '../middleware/rbac'
import { buildErrorPayload } from '../utils/errors'
import { handlePrismaError, prisma } from '../utils/prisma'
import { deleteCache, getCache, setCache } from '../utils/ttlCache'
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

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  createdAt: z.string().optional(),
})

const userListResponseSchema = z.object({
  users: z.array(userSchema),
})

const userResponseSchema = z.object({
  user: userSchema,
})

const userOptionsResponseSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      email: z.string().email(),
      role: z.nativeEnum(UserRole),
    })
  ),
})

export async function userRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  // ユーザー作成（Adminのみ）
  app.post<{ Body: CreateUserBody }>(
    '/users',
    {
      preHandler: requireAdmin(),
      schema: {
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
          role: z.nativeEnum(UserRole),
        }),
        response: {
          201: userResponseSchema,
        },
      },
    },
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
      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(password, 10)

      try {
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
        deleteCache('users:options')

        return reply.code(201).send({ user })
      } catch (error) {
        return handlePrismaError(reply, error, {
          P2002: { status: 409, message: 'User already exists' },
        })
      }
    }
  )

  // ユーザー一覧（Adminのみ）
  app.get(
    '/users',
    {
      preHandler: requireAdmin(),
      schema: {
        response: {
          200: userListResponseSchema,
        },
      },
    },
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

  app.get(
    '/users/options',
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: userOptionsResponseSchema,
        },
      },
    },
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
  app.patch<{ Params: { id: string }; Body: UpdateUserRoleBody }>(
    '/users/:id/role',
    {
      preHandler: requireAdmin(),
      schema: {
        params: z.object({
          id: z.string().min(1),
        }),
        body: z.object({
          role: z.nativeEnum(UserRole),
        }),
        response: {
          200: userResponseSchema,
        },
      },
    },
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

      try {
        const user = await prisma.user.update({
          where: { id },
          data: { role },
          select: {
            id: true,
            email: true,
            role: true,
          },
        })
        deleteCache('users:options')

        return { user }
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
  )
}
