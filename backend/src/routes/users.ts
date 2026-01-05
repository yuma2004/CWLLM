import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import { requireAdmin } from '../middleware/rbac'
import { prisma } from '../utils/prisma'

interface CreateUserBody {
  email: string
  password: string
  role: string
}

interface UpdateUserRoleBody {
  role: string
}

export async function userRoutes(fastify: FastifyInstance) {
  // ユーザー作成（Adminのみ）
  fastify.post<{ Body: CreateUserBody }>(
    '/users',
    { preHandler: requireAdmin() },
    async (request: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply) => {
      const { email, password, role } = request.body

      // バリデーション
      const validRoles = ['admin', 'sales', 'ops', 'readonly']
      if (!validRoles.includes(role)) {
        return reply.code(400).send({ error: 'Invalid role' })
      }

      // 既存ユーザーチェック
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return reply.code(409).send({ error: 'User already exists' })
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
      const validRoles = ['admin', 'sales', 'ops', 'readonly']
      if (!validRoles.includes(role)) {
        return reply.code(400).send({ error: 'Invalid role' })
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
