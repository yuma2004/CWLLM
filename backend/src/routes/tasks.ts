import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAdmin, requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  TaskBulkUpdateBody,
  TaskCreateBody,
  TaskListQuery,
  TaskUpdateBody,
  taskBulkUpdateBodySchema,
  taskBulkUpdateResponseSchema,
  taskCreateBodySchema,
  taskListQuerySchema,
  taskListResponseSchema,
  taskParamsSchema,
  taskResponseSchema,
  taskUpdateBodySchema,
} from './tasks.schemas'
import {
  bulkUpdateTasksHandler,
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  listCompanyTasksHandler,
  listMyTasksHandler,
  listProjectTasksHandler,
  listTasksHandler,
  listWholesaleTasksHandler,
  updateTaskHandler,
} from './tasks.handlers'

export async function taskRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: TaskListQuery }>(
    '/tasks',
    {
      preHandler: requireAdmin(),
      schema: {
        tags: ['Tasks'],
        querystring: taskListQuerySchema,
        response: {
          200: taskListResponseSchema,
        },
      },
    },
    listTasksHandler
  )

  app.get<{ Params: { id: string } }>(
    '/tasks/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Tasks'],
        params: taskParamsSchema,
        response: {
          200: taskResponseSchema,
        },
      },
    },
    getTaskHandler
  )

  app.post<{ Body: TaskCreateBody }>(
    '/tasks',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Tasks'],
        body: taskCreateBodySchema,
        response: {
          201: taskResponseSchema,
        },
      },
    },
    createTaskHandler
  )

  app.patch<{ Params: { id: string }; Body: TaskUpdateBody }>(
    '/tasks/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Tasks'],
        params: taskParamsSchema,
        body: taskUpdateBodySchema,
        response: {
          200: taskResponseSchema,
        },
      },
    },
    updateTaskHandler
  )

  app.patch<{ Body: TaskBulkUpdateBody }>(
    '/tasks/bulk',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Tasks'],
        body: taskBulkUpdateBodySchema,
        response: {
          200: taskBulkUpdateResponseSchema,
        },
      },
    },
    bulkUpdateTasksHandler
  )

  app.delete<{ Params: { id: string } }>(
    '/tasks/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Tasks'],
        params: taskParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    deleteTaskHandler
  )

  app.get<{ Querystring: TaskListQuery }>(
    '/me/tasks',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Tasks'],
        querystring: taskListQuerySchema,
        response: {
          200: taskListResponseSchema,
        },
      },
    },
    listMyTasksHandler
  )

  app.get<{ Params: { id: string }; Querystring: TaskListQuery }>(
    '/companies/:id/tasks',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Tasks'],
        params: taskParamsSchema,
        querystring: taskListQuerySchema,
        response: {
          200: taskListResponseSchema,
        },
      },
    },
    listCompanyTasksHandler
  )

  app.get<{ Params: { id: string }; Querystring: TaskListQuery }>(
    '/projects/:id/tasks',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Tasks'],
        params: taskParamsSchema,
        querystring: taskListQuerySchema,
        response: {
          200: taskListResponseSchema,
        },
      },
    },
    listProjectTasksHandler
  )

  app.get<{ Params: { id: string }; Querystring: TaskListQuery }>(
    '/wholesales/:id/tasks',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Tasks'],
        params: taskParamsSchema,
        querystring: taskListQuerySchema,
        response: {
          200: taskListResponseSchema,
        },
      },
    },
    listWholesaleTasksHandler
  )
}
