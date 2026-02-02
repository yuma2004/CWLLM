import { FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, TaskStatus, TargetType } from '@prisma/client'
import { attachTargetInfo } from '../services'
import {
  badRequest,
  buildPaginatedResponse,
  connectOrDisconnect,
  createEnumNormalizer,
  handlePrismaError,
  isNonEmptyString,
  notFound,
  parseDate,
  parsePagination,
  prisma,
  unauthorized,
} from '../utils'
import { JWTUser } from '../types/auth'
import {
  TaskBulkUpdateBody,
  TaskCreateBody,
  TaskListQuery,
  TaskUpdateBody,
} from './tasks.schemas'

const normalizeStatus = createEnumNormalizer(new Set(Object.values(TaskStatus)))
const normalizeTargetType = createEnumNormalizer(new Set(Object.values(TargetType)))
const canManageAllTasks = (user?: JWTUser) => user?.role === 'admin'

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
      q?: string
      status?: TaskStatus
      targetType?: TargetType
      dueFrom?: Date | null
      dueTo?: Date | null
    }

const TASK_FILTER_ERROR_MESSAGES = {
  status: 'Invalid status',
  targetType: 'Invalid targetType',
  dueFrom: 'Invalid dueFrom date',
  dueTo: 'Invalid dueTo date',
}

const parseTaskListFilters = (query: TaskListQuery): TaskListFilterResult => {
  const q = query.q?.trim()
  const status = normalizeStatus(query.status)
  if (status === null) {
    return { ok: false, error: TASK_FILTER_ERROR_MESSAGES.status }
  }

  const targetType = normalizeTargetType(query.targetType)
  if (targetType === null) {
    return { ok: false, error: TASK_FILTER_ERROR_MESSAGES.targetType }
  }

  const dueFrom = parseDate(query.dueFrom)
  const dueTo = parseDate(query.dueTo)
  if (query.dueFrom && !dueFrom) {
    return { ok: false, error: TASK_FILTER_ERROR_MESSAGES.dueFrom }
  }
  if (query.dueTo && !dueTo) {
    return { ok: false, error: TASK_FILTER_ERROR_MESSAGES.dueTo }
  }

  return { ok: true, q: q && q.length > 0 ? q : undefined, status, targetType, dueFrom, dueTo }
}

type TaskListFiltersOk = Extract<TaskListFilterResult, { ok: true }>

const buildTaskWhere = (
  filters: TaskListFiltersOk,
  options: {
    assigneeId?: string
    targetType?: TargetType
    targetId?: string
  }
) => {
  const where: Prisma.TaskWhereInput = {}
  if (options.assigneeId) {
    where.assigneeId = options.assigneeId
  }
  if (options.targetType) {
    where.targetType = options.targetType
  }
  if (options.targetId) {
    where.targetId = options.targetId
  }
  if (filters.status) {
    where.status = filters.status
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  if (filters.dueFrom || filters.dueTo) {
    where.dueDate = {
      ...(filters.dueFrom ? { gte: filters.dueFrom } : {}),
      ...(filters.dueTo ? { lte: filters.dueTo } : {}),
    }
  }
  return where
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
        assignee: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.task.count({ where }),
  ])
  const itemsWithTarget = await attachTargetInfo(items)

  return buildPaginatedResponse(itemsWithTarget, page, pageSize, total)
}

const listTasksForTarget = async (
  targetType: TargetType,
  request: FastifyRequest<{ Params: { id: string }; Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser | undefined
  const userId = user?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
  const filters = parseTaskListFilters(request.query)
  if (!filters.ok) {
    return reply.code(400).send(badRequest(filters.error))
  }

  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize
  )

  const assigneeId = !canManageAllTasks(user) ? userId : request.query.assigneeId
  const where = buildTaskWhere(filters, {
    assigneeId,
    targetType,
    targetId: request.params.id,
  })
  return listTasks(where, page, pageSize, skip)
}

export const listTasksHandler = async (
  request: FastifyRequest<{ Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser | undefined
  const userId = user?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
  const filters = parseTaskListFilters(request.query)
  if (!filters.ok) {
    return reply.code(400).send(badRequest(filters.error))
  }

  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize
  )

  const assigneeId = !canManageAllTasks(user) ? userId : request.query.assigneeId
  const where = buildTaskWhere(filters, {
    assigneeId,
    targetType: filters.targetType,
    targetId: request.query.targetId,
  })
  return listTasks(where, page, pageSize, skip)
}

export const getTaskHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser | undefined
  const userId = user?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
  const where: Prisma.TaskWhereInput = { id: request.params.id }
  if (!canManageAllTasks(user)) {
    where.assigneeId = userId
  }
  const task = await prisma.task.findFirst({
    where,
    include: { assignee: { select: { id: true, email: true, name: true } } },
  })
  if (!task) {
    return reply.code(404).send(notFound('Task'))
  }
  return { task }
}

export const createTaskHandler = async (
  request: FastifyRequest<{ Body: TaskCreateBody }>,
  reply: FastifyReply
) => {
  const { targetId, title, description, assigneeId } = request.body
  const userId = (request.user as JWTUser | undefined)?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
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

  if (normalizedTargetType !== 'general') {
    const target = await ensureTargetExists(normalizedTargetType, targetId)
    if (!target) {
      return reply.code(404).send(notFound('Target'))
    }
  }

  try {
    const task = await prisma.task.create({
      data: {
        targetType: normalizedTargetType,
        targetId,
        title: title.trim(),
        description,
        dueDate: dueDate ?? undefined,
        assigneeId: assigneeId ?? userId,
        status: status ?? 'todo',
      },
    })

    return reply.code(201).send({ task })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const updateTaskHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: TaskUpdateBody }>,
  reply: FastifyReply
) => {
  const { title, description, assigneeId } = request.body
  const user = request.user as JWTUser | undefined
  const userId = user?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
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

  const existing = await prisma.task.findFirst({
    where: {
      id: request.params.id,
      ...(canManageAllTasks(user) ? {} : { assigneeId: userId }),
    },
  })
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

    return { task }
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const bulkUpdateTasksHandler = async (
  request: FastifyRequest<{ Body: TaskBulkUpdateBody }>,
  reply: FastifyReply
) => {
  const { taskIds, assigneeId } = request.body
  const user = request.user as JWTUser | undefined
  const userId = user?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
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

  const existingTasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      ...(canManageAllTasks(user) ? {} : { assigneeId: userId }),
    },
    select: { id: true },
  })
  if (existingTasks.length !== taskIds.length) {
    return reply.code(404).send(notFound('Task'))
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

export const deleteTaskHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser | undefined
  const userId = user?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
  const existing = await prisma.task.findFirst({
    where: {
      id: request.params.id,
      ...(canManageAllTasks(user) ? {} : { assigneeId: userId }),
    },
  })
  if (!existing) {
    return reply.code(404).send(notFound('Task'))
  }

  try {
    await prisma.task.delete({ where: { id: request.params.id } })

    return reply.code(204).send()
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const listMyTasksHandler = async (
  request: FastifyRequest<{ Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  const user = request.user as JWTUser | undefined
  const userId = user?.userId
  if (!userId) {
    return reply.code(401).send(unauthorized())
  }
  const filters = parseTaskListFilters(request.query)
  if (!filters.ok) {
    return reply.code(400).send(badRequest(filters.error))
  }

  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize
  )

  const assigneeId = !canManageAllTasks(user) ? userId : request.query.assigneeId
  const where = buildTaskWhere(filters, {
    assigneeId,
    targetType: filters.targetType,
    targetId: request.query.targetId,
  })
  return listTasks(where, page, pageSize, skip)
}

export const listCompanyTasksHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  return listTasksForTarget('company', request, reply)
}

export const listProjectTasksHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  return listTasksForTarget('project', request, reply)
}

export const listWholesaleTasksHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  return listTasksForTarget('wholesale', request, reply)
}



