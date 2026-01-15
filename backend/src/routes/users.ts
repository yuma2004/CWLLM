import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAdmin, requireAuth } from '../middleware/rbac'
import {
  createUserHandler,
  listUserOptionsHandler,
  listUsersHandler,
  updateUserRoleHandler,
} from './users.handlers'
import {
  CreateUserBody,
  UpdateUserRoleBody,
  createUserBodySchema,
  updateUserRoleBodySchema,
  updateUserRoleParamsSchema,
  userListResponseSchema,
  userOptionsResponseSchema,
  userResponseSchema,
} from './users.schemas'

export async function userRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.post<{ Body: CreateUserBody }>(
    '/users',
    {
      preHandler: requireAdmin(),
      schema: {
        body: createUserBodySchema,
        response: {
          201: userResponseSchema,
        },
      },
    },
    createUserHandler
  )

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
    listUsersHandler
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
    listUserOptionsHandler
  )

  app.patch<{ Params: { id: string }; Body: UpdateUserRoleBody }>(
    '/users/:id/role',
    {
      preHandler: requireAdmin(),
      schema: {
        params: updateUserRoleParamsSchema,
        body: updateUserRoleBodySchema,
        response: {
          200: userResponseSchema,
        },
      },
    },
    updateUserRoleHandler
  )
}
