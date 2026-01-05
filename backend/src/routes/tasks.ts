import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'
import { parsePagination } from '../utils/pagination'
import { handlePrismaError, prisma } from '../utils/prisma'
import { isNonEmptyString, parseDate } from '../utils/validation'
import { JWTUser } from '../types/auth'

const TASK_STATUSES = new Set(['todo', 'in_progress', 'done', 'cancelled'])
const TARGET_TYPES = new Set(['company', 'project', 'wholesale'])

const normalizeStatus = (value?: string) => {
  if (value === undefined) return undefined
  if (!TASK_STATUSES.has(value)) return null
  return value
}

const normalizeTargetType = (value?: string) => {
  if (value === undefined) return undefined
  if (!TARGET_TYPES.has(value)) return null
  return value
}

interface TaskCreateBody {
  targetType: string
  targetId: string
  title: string
  description?: string
  dueDate?: string
  assigneeId?: string
  status?: string
}

interface TaskUpdateBody {
  title?: string
  description?: string | null
  dueDate?: string | null
  assigneeId?: string | null
  status?: string
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

const ensureTargetExists = async (targetType: string, targetId: string) => {
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

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: TaskListQuery }>(
    '/tasks',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const status = normalizeStatus(request.query.status)
      if (request.query.status !== undefined && status === null) {
        return reply.code(400).send({ error: 'Invalid status' })
      }

      const targetType = normalizeTargetType(request.query.targetType)
      if (request.query.targetType !== undefined && targetType === null) {
        return reply.code(400).send({ error: 'Invalid targetType' })
      }

      const dueFrom = parseDate(request.query.dueFrom)
      const dueTo = parseDate(request.query.dueTo)
      if (request.query.dueFrom && !dueFrom) {
        return reply.code(400).send({ error: 'Invalid dueFrom date' })
      }
      if (request.query.dueTo && !dueTo) {
        return reply.code(400).send({ error: 'Invalid dueTo date' })
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.TaskWhereInput = {}
      if (status) {
        where.status = status
      }
      if (targetType) {
        where.targetType = targetType
      }
      if (request.query.targetId) {
        where.targetId = request.query.targetId
      }
      if (request.query.assigneeId) {
        where.assigneeId = request.query.assigneeId
      }
      if (dueFrom || dueTo) {
        where.dueDate = {
          ...(dueFrom ? { gte: dueFrom } : {}),
          ...(dueTo ? { lte: dueTo } : {}),
        }
      }

      const [items, total] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: pageSize,
        }),
        prisma.task.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const task = await prisma.task.findUnique({ where: { id: request.params.id } })
      if (!task) {
        return reply.code(404).send({ error: 'Task not found' })
      }
      return { task }
    }
  )

  fastify.post<{ Body: TaskCreateBody }>(
    '/tasks',
    { preHandler: requireWriteAccess() },
    async (request: FastifyRequest<{ Body: TaskCreateBody }>, reply: FastifyReply) => {
      const { targetType, targetId, title, description, assigneeId } = request.body
      const status = normalizeStatus(request.body.status)

      if (!isNonEmptyString(targetType) || !TARGET_TYPES.has(targetType)) {
        return reply.code(400).send({ error: 'targetType is required' })
      }
      if (!isNonEmptyString(targetId)) {
        return reply.code(400).send({ error: 'targetId is required' })
      }
      if (!isNonEmptyString(title)) {
        return reply.code(400).send({ error: 'title is required' })
      }
      if (request.body.status !== undefined && status === null) {
        return reply.code(400).send({ error: 'Invalid status' })
      }
      if (assigneeId !== undefined && !isNonEmptyString(assigneeId)) {
        return reply.code(400).send({ error: 'Invalid assigneeId' })
      }

      const dueDate = parseDate(request.body.dueDate)
      if (request.body.dueDate && !dueDate) {
        return reply.code(400).send({ error: 'Invalid dueDate' })
      }

      const target = await ensureTargetExists(targetType, targetId)
      if (!target) {
        return reply.code(404).send({ error: 'Target not found' })
      }

      try {
        const task = await prisma.task.create({
          data: {
            targetType,
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

  fastify.patch<{ Params: { id: string }; Body: TaskUpdateBody }>(
    '/tasks/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { title, description, assigneeId } = request.body
      const status = normalizeStatus(request.body.status)

      if (title !== undefined && !isNonEmptyString(title)) {
        return reply.code(400).send({ error: 'title is required' })
      }
      if (request.body.status !== undefined && status === null) {
        return reply.code(400).send({ error: 'Invalid status' })
      }
      if (assigneeId !== undefined && assigneeId !== null && !isNonEmptyString(assigneeId)) {
        return reply.code(400).send({ error: 'Invalid assigneeId' })
      }

      const dueDate = parseDate(request.body.dueDate ?? undefined)
      if (request.body.dueDate !== undefined && request.body.dueDate !== null && !dueDate) {
        return reply.code(400).send({ error: 'Invalid dueDate' })
      }

      const existing = await prisma.task.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send({ error: 'Task not found' })
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
        data.assignee =
          assigneeId === null
            ? { disconnect: true }
            : {
                connect: {
                  id: assigneeId,
                },
              }
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

  fastify.delete<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const existing = await prisma.task.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send({ error: 'Task not found' })
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

  fastify.get<{ Querystring: TaskListQuery }>(
    '/me/tasks',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = (request.user as JWTUser).userId
      const status = normalizeStatus(request.query.status)
      if (request.query.status !== undefined && status === null) {
        return reply.code(400).send({ error: 'Invalid status' })
      }
      const dueFrom = parseDate(request.query.dueFrom)
      const dueTo = parseDate(request.query.dueTo)
      if (request.query.dueFrom && !dueFrom) {
        return reply.code(400).send({ error: 'Invalid dueFrom date' })
      }
      if (request.query.dueTo && !dueTo) {
        return reply.code(400).send({ error: 'Invalid dueTo date' })
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.TaskWhereInput = { assigneeId: userId }
      if (status) {
        where.status = status
      }
      if (dueFrom || dueTo) {
        where.dueDate = {
          ...(dueFrom ? { gte: dueFrom } : {}),
          ...(dueTo ? { lte: dueTo } : {}),
        }
      }

      const [items, total] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: pageSize,
        }),
        prisma.task.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.get<{ Params: { id: string }; Querystring: TaskListQuery }>(
    '/companies/:id/tasks',
    { preHandler: requireAuth() },
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

      const [items, total] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: pageSize,
        }),
        prisma.task.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.get<{ Params: { id: string }; Querystring: TaskListQuery }>(
    '/projects/:id/tasks',
    { preHandler: requireAuth() },
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

      const [items, total] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: pageSize,
        }),
        prisma.task.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.get<{ Params: { id: string }; Querystring: TaskListQuery }>(
    '/wholesales/:id/tasks',
    { preHandler: requireAuth() },
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

      const [items, total] = await prisma.$transaction([
        prisma.task.findMany({
          where,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: pageSize,
        }),
        prisma.task.count({ where }),
      ])

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )
}
