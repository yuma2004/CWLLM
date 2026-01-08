import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, TaskStatus, TargetType } from '@prisma/client'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'
import { attachTargetInfo } from '../services/taskTargets'
import { badRequest, notFound } from '../utils/errors'
import { buildPaginatedResponse, parsePagination } from '../utils/pagination'
import { connectOrDisconnect, handlePrismaError, prisma } from '../utils/prisma'
import { createEnumNormalizer, isNonEmptyString, parseDate } from '../utils/validation'
import { JWTUser } from '../types/auth'
import { dateSchema, paginationSchema } from './shared/schemas'

const normalizeStatus = createEnumNormalizer(new Set(Object.values(TaskStatus)))
const normalizeTargetType = createEnumNormalizer(new Set(Object.values(TargetType)))

interface TaskCreateBody {
  targetType: TargetType
  targetId: string
  title: string
  description?: string
  dueDate?: string
  assigneeId?: string
  status?: TaskStatus
}

interface TaskUpdateBody {
  title?: string
  description?: string | null
  dueDate?: string | null
  assigneeId?: string | null
  status?: TaskStatus
}

interface TaskBulkUpdateBody {
  taskIds: string[]
  dueDate?: string | null
  assigneeId?: string | null
  status?: TaskStatus
}

interface TaskListQuery {
  status?: string
  assigneeId?: string
  targetType?: string
  targetId?: string
  dueFrom?: string
  dueTo?: string
  page?: string
  pageSize?: string
}

const taskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    status: z.nativeEnum(TaskStatus),
    dueDate: dateSchema.nullable().optional(),
    targetType: z.nativeEnum(TargetType),
    targetId: z.string(),
    target: z
      .object({
        id: z.string(),
        type: z.nativeEnum(TargetType),
        name: z.string(),
      })
      .optional(),
    assigneeId: z.string().nullable().optional(),
    assignee: z
      .object({
        id: z.string(),
        email: z.string(),
      })
      .nullable()
      .optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

const taskListQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().optional(),
  targetType: z.nativeEnum(TargetType).optional(),
  targetId: z.string().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

const taskParamsSchema = z.object({ id: z.string().min(1) })

const taskCreateBodySchema = z.object({
  targetType: z.nativeEnum(TargetType),
  targetId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
})

const taskUpdateBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
})

const taskBulkUpdateBodySchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
})

const taskResponseSchema = z.object({ task: taskSchema }).passthrough()
const taskListResponseSchema = z
  .object({
    items: z.array(taskSchema),
    pagination: paginationSchema,
  })
  .passthrough()
const taskBulkUpdateResponseSchema = z.object({ updated: z.number() }).passthrough()

const ensureTargetExists = async (targetType: TargetType, targetId: string) => {
  if (targetType === 'company') {
    return prisma.company.findUnique({ where: { id: targetId } })
  }
  if (targetType === 'project') {
    return prisma.project.findUnique({ where: { id: targetId } })
  }
  if (targetType === 'wholesale') {
    return prisma.wholesale.findUnique({ where: { id: targetId } })
  }
  return null
}

type TaskListFilterResult =
  | {
      ok: false
      error: string
    }
  | {
      ok: true
      status?: TaskStatus
      targetType?: TargetType
      dueFrom?: Date | null
      dueTo?: Date | null
    }

const parseTaskListFilters = (query: TaskListQuery): TaskListFilterResult => {
  const status = normalizeStatus(query.status)
  if (status === null) {
    return { ok: false, error: 'Invalid status' }
  }

  const targetType = normalizeTargetType(query.targetType)
  if (targetType === null) {
    return { ok: false, error: 'Invalid targetType' }
  }

  const dueFrom = parseDate(query.dueFrom)
  const dueTo = parseDate(query.dueTo)
  if (query.dueFrom && !dueFrom) {
    return { ok: false, error: 'Invalid dueFrom date' }
  }
  if (query.dueTo && !dueTo) {
    return { ok: false, error: 'Invalid dueTo date' }
  }

  return { ok: true, status, targetType, dueFrom, dueTo }
}

const listTasks = async (
  where: Prisma.TaskWhereInput,
  page: number,
  pageSize: number,
  skip: number
) => {
  const [items, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
      include: {
        assignee: { select: { id: true, email: true } },
      },
    }),
    prisma.task.count({ where }),
  ])
  const itemsWithTarget = await attachTargetInfo(items)

  return buildPaginatedResponse(itemsWithTarget, page, pageSize, total)
}

export async function taskRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: TaskListQuery }>(
    '/tasks',
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
    async (request, reply) => {
      const filters = parseTaskListFilters(request.query)
      if (!filters.ok) {
        return reply.code(400).send(badRequest(filters.error))
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.TaskWhereInput = {}
      if (filters.status) {
        where.status = filters.status
      }
      if (filters.targetType) {
        where.targetType = filters.targetType
      }
      if (request.query.targetId) {
        where.targetId = request.query.targetId
      }
      if (request.query.assigneeId) {
        where.assigneeId = request.query.assigneeId
      }
      if (filters.dueFrom || filters.dueTo) {
        where.dueDate = {
          ...(filters.dueFrom ? { gte: filters.dueFrom } : {}),
          ...(filters.dueTo ? { lte: filters.dueTo } : {}),
        }
      }

      return listTasks(where, page, pageSize, skip)
    }
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
    async (request, reply) => {
      const task = await prisma.task.findUnique({
        where: { id: request.params.id },
        include: { assignee: { select: { id: true, email: true } } },
      })
      if (!task) {
        return reply.code(404).send(notFound('Task'))
      }
      return { task }
    }
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
    async (request: FastifyRequest<{ Body: TaskCreateBody }>, reply: FastifyReply) => {
      const { targetId, title, description, assigneeId } = request.body
      const status = normalizeStatus(request.body.status)
      const normalizedTargetType = normalizeTargetType(request.body.targetType)

      if (normalizedTargetType === null || normalizedTargetType === undefined) {
        return reply.code(400).send(badRequest('targetType is required'))
      }
      if (!isNonEmptyString(targetId)) {
        return reply.code(400).send(badRequest('targetId is required'))
      }
      if (!isNonEmptyString(title)) {
        return reply.code(400).send(badRequest('title is required'))
      }
      if (request.body.status !== undefined && status === null) {
        return reply.code(400).send(badRequest('Invalid status'))
      }
      if (assigneeId !== undefined && !isNonEmptyString(assigneeId)) {
        return reply.code(400).send(badRequest('Invalid assigneeId'))
      }

      const dueDate = parseDate(request.body.dueDate)
      if (request.body.dueDate && !dueDate) {
        return reply.code(400).send(badRequest('Invalid dueDate'))
      }

      const target = await ensureTargetExists(normalizedTargetType, targetId)
      if (!target) {
        return reply.code(404).send(notFound('Target'))
      }

      try {
        const task = await prisma.task.create({
          data: {
            targetType: normalizedTargetType,
            targetId,
            title: title.trim(),
            description,
            dueDate: dueDate ?? undefined,
            assigneeId,
            status: status ?? 'todo',
          },
        })

        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Task',
          entityId: task.id,
          action: 'create',
          userId,
          after: task,
        })

        return reply.code(201).send({ task })
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
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
    async (request, reply) => {
      const { title, description, assigneeId } = request.body
      const status = normalizeStatus(request.body.status)

      if (title !== undefined && !isNonEmptyString(title)) {
        return reply.code(400).send(badRequest('title is required'))
      }
      if (request.body.status !== undefined && status === null) {
        return reply.code(400).send(badRequest('Invalid status'))
      }
      if (assigneeId !== undefined && assigneeId !== null && !isNonEmptyString(assigneeId)) {
        return reply.code(400).send(badRequest('Invalid assigneeId'))
      }

      const dueDate = parseDate(request.body.dueDate ?? undefined)
      if (request.body.dueDate !== undefined && request.body.dueDate !== null && !dueDate) {
        return reply.code(400).send(badRequest('Invalid dueDate'))
      }

      const existing = await prisma.task.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send(notFound('Task'))
      }

      const data: Prisma.TaskUpdateInput = {}
      if (title !== undefined) {
        data.title = title.trim()
      }
      if (description !== undefined) {
        data.description = description
      }
      if (status !== undefined && status !== null) {
        data.status = status
      }
      if (assigneeId !== undefined) {
        data.assignee = connectOrDisconnect(assigneeId)
      }
      if (request.body.dueDate !== undefined) {
        data.dueDate = dueDate ?? null
      }

      try {
        const task = await prisma.task.update({
          where: { id: request.params.id },
          data,
        })

        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Task',
          entityId: task.id,
          action: 'update',
          userId,
          before: existing,
          after: task,
        })

        return { task }
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
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
    async (request, reply) => {
      const { taskIds, assigneeId } = request.body
      const status = normalizeStatus(request.body.status)
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return reply.code(400).send(badRequest('taskIds is required'))
      }
      if (taskIds.some((taskId) => !isNonEmptyString(taskId))) {
        return reply.code(400).send(badRequest('Invalid taskIds'))
      }
      if (request.body.status !== undefined && status === null) {
        return reply.code(400).send(badRequest('Invalid status'))
      }
      if (assigneeId !== undefined && assigneeId !== null && !isNonEmptyString(assigneeId)) {
        return reply.code(400).send(badRequest('Invalid assigneeId'))
      }

      const dueDate = parseDate(request.body.dueDate ?? undefined)
      if (request.body.dueDate !== undefined && request.body.dueDate !== null && !dueDate) {
        return reply.code(400).send(badRequest('Invalid dueDate'))
      }

      const updates = taskIds.map((taskId) => {
        const data: Prisma.TaskUpdateInput = {}
        if (status !== undefined && status !== null) {
          data.status = status
        }
        if (request.body.dueDate !== undefined) {
          data.dueDate = dueDate ?? null
        }
        if (assigneeId !== undefined) {
          data.assignee = connectOrDisconnect(assigneeId)
        }
        return prisma.task.update({ where: { id: taskId }, data })
      })

      await prisma.$transaction(updates)

      return { updated: updates.length }
    }
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
    async (request, reply) => {
      const existing = await prisma.task.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send(notFound('Task'))
      }

      try {
        await prisma.task.delete({ where: { id: request.params.id } })

        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Task',
          entityId: existing.id,
          action: 'delete',
          userId,
          before: existing,
        })

        return reply.code(204).send()
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
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
    async (request, reply) => {
      const userId = (request.user as JWTUser).userId
      const filters = parseTaskListFilters(request.query)
      if (!filters.ok) {
        return reply.code(400).send(badRequest(filters.error))
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.TaskWhereInput = { assigneeId: userId }
      if (filters.status) {
        where.status = filters.status
      }
      if (filters.targetType) {
        where.targetType = filters.targetType
      }
      if (request.query.targetId) {
        where.targetId = request.query.targetId
      }
      if (filters.dueFrom || filters.dueTo) {
        where.dueDate = {
          ...(filters.dueFrom ? { gte: filters.dueFrom } : {}),
          ...(filters.dueTo ? { lte: filters.dueTo } : {}),
        }
      }

      return listTasks(where, page, pageSize, skip)
    }
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
    async (request) => {
      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )
      const status = normalizeStatus(request.query.status)
      const where: Prisma.TaskWhereInput = {
        targetType: 'company',
        targetId: request.params.id,
      }
      if (status) {
        where.status = status
      }

      return listTasks(where, page, pageSize, skip)
    }
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
    async (request) => {
      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )
      const status = normalizeStatus(request.query.status)
      const where: Prisma.TaskWhereInput = {
        targetType: 'project',
        targetId: request.params.id,
      }
      if (status) {
        where.status = status
      }

      return listTasks(where, page, pageSize, skip)
    }
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
    async (request) => {
      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )
      const status = normalizeStatus(request.query.status)
      const where: Prisma.TaskWhereInput = {
        targetType: 'wholesale',
        targetId: request.params.id,
      }
      if (status) {
        where.status = status
      }

      return listTasks(where, page, pageSize, skip)
    }
  )
}
