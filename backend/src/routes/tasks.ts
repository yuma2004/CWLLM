import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, type Task as PrismaTask, TaskStatus, TargetType } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'
import { badRequest, notFound } from '../utils/errors'
import { parsePagination } from '../utils/pagination'
import { connectOrDisconnect, handlePrismaError, prisma } from '../utils/prisma'
import { createEnumNormalizer, isNonEmptyString, parseDate } from '../utils/validation'
import { JWTUser } from '../types/auth'

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

const attachTargetInfo = async (items: PrismaTask[]) => {
  const companyIds = new Set<string>()
  const projectIds = new Set<string>()
  const wholesaleIds = new Set<string>()

  items.forEach((task) => {
    if (task.targetType === 'company') companyIds.add(task.targetId)
    if (task.targetType === 'project') projectIds.add(task.targetId)
    if (task.targetType === 'wholesale') wholesaleIds.add(task.targetId)
  })

  const [companies, projects, wholesales] = await Promise.all([
    companyIds.size > 0
      ? prisma.company.findMany({
          where: { id: { in: Array.from(companyIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    projectIds.size > 0
      ? prisma.project.findMany({
          where: { id: { in: Array.from(projectIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    wholesaleIds.size > 0
      ? prisma.wholesale.findMany({
          where: { id: { in: Array.from(wholesaleIds) } },
          select: { id: true, company: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ])

  const companyMap = new Map(companies.map((company) => [company.id, company.name]))
  const projectMap = new Map(projects.map((project) => [project.id, project.name]))
  const wholesaleMap = new Map(
    wholesales.map((wholesale) => [wholesale.id, wholesale.company?.name ?? wholesale.id])
  )

  return items.map((task) => {
    const targetName =
      task.targetType === 'company'
        ? companyMap.get(task.targetId)
        : task.targetType === 'project'
          ? projectMap.get(task.targetId)
          : wholesaleMap.get(task.targetId)

    return {
      ...task,
      target: {
        id: task.targetId,
        type: task.targetType,
        name: targetName ?? task.targetId,
      },
    }
  })
}

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: TaskListQuery }>(
    '/tasks',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const status = normalizeStatus(request.query.status)
      if (request.query.status !== undefined && status === null) {
        return reply.code(400).send(badRequest('Invalid status'))
      }

      const targetType = normalizeTargetType(request.query.targetType)
      if (request.query.targetType !== undefined && targetType === null) {
        return reply.code(400).send(badRequest('Invalid targetType'))
      }

      const dueFrom = parseDate(request.query.dueFrom)
      const dueTo = parseDate(request.query.dueTo)
      if (request.query.dueFrom && !dueFrom) {
        return reply.code(400).send(badRequest('Invalid dueFrom date'))
      }
      if (request.query.dueTo && !dueTo) {
        return reply.code(400).send(badRequest('Invalid dueTo date'))
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
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.count({ where }),
      ])
      const itemsWithTarget = await attachTargetInfo(items)

      return {
        items: itemsWithTarget,
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

  fastify.post<{ Body: TaskCreateBody }>(
    '/tasks',
    { preHandler: requireWriteAccess() },
    async (request: FastifyRequest<{ Body: TaskCreateBody }>, reply: FastifyReply) => {
      const { targetType, targetId, title, description, assigneeId } = request.body
      const status = normalizeStatus(request.body.status)

      if (!isNonEmptyString(targetType) || !TARGET_TYPES.has(targetType)) {
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

      const target = await ensureTargetExists(targetType, targetId)
      if (!target) {
        return reply.code(404).send(notFound('Target'))
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

  fastify.patch<{ Body: TaskBulkUpdateBody }>(
    '/tasks/bulk',
    { preHandler: requireWriteAccess() },
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

  fastify.delete<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: requireWriteAccess() },
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

  fastify.get<{ Querystring: TaskListQuery }>(
    '/me/tasks',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const userId = (request.user as JWTUser).userId
      const status = normalizeStatus(request.query.status)
      if (request.query.status !== undefined && status === null) {
        return reply.code(400).send(badRequest('Invalid status'))
      }
      const targetType = normalizeTargetType(request.query.targetType)
      if (request.query.targetType !== undefined && targetType === null) {
        return reply.code(400).send(badRequest('Invalid targetType'))
      }
      const dueFrom = parseDate(request.query.dueFrom)
      const dueTo = parseDate(request.query.dueTo)
      if (request.query.dueFrom && !dueFrom) {
        return reply.code(400).send(badRequest('Invalid dueFrom date'))
      }
      if (request.query.dueTo && !dueTo) {
        return reply.code(400).send(badRequest('Invalid dueTo date'))
      }

      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize
      )

      const where: Prisma.TaskWhereInput = { assigneeId: userId }
      if (status) {
        where.status = status
      }
      if (targetType) {
        where.targetType = targetType
      }
      if (request.query.targetId) {
        where.targetId = request.query.targetId
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
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.count({ where }),
      ])
      const itemsWithTarget = await attachTargetInfo(items)

      return {
        items: itemsWithTarget,
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
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.count({ where }),
      ])
      const itemsWithTarget = await attachTargetInfo(items)

      return {
        items: itemsWithTarget,
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
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.count({ where }),
      ])
      const itemsWithTarget = await attachTargetInfo(items)

      return {
        items: itemsWithTarget,
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
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.count({ where }),
      ])
      const itemsWithTarget = await attachTargetInfo(items)

      return {
        items: itemsWithTarget,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )
}
