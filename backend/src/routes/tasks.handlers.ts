import { FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, TaskStatus, TargetType } from '@prisma/client'
import {
  badRequest,
  createEnumNormalizer,
  handlePrismaError,
  isNonEmptyString,
  notFound,
  parseDate,
  parsePagination,
  prisma,
  requireRequestUser,
} from '../utils'
import {
  buildTaskOwnershipFilter,
  canManageAllTasks,
  resolveTaskAssigneeFilter,
} from '../services/tasks/taskAuthz'
import {
  buildTaskUpdateData,
  ensureTaskTargetExists,
} from '../services/tasks/taskMutations'
import {
  buildTaskWhere,
  listTasks,
  parseTaskListFilters,
} from '../services/tasks/taskQuery'
import {
  TaskBulkUpdateBody,
  TaskCreateBody,
  TaskListQuery,
  TaskUpdateBody,
} from './tasks.schemas'

const normalizeStatus = createEnumNormalizer(new Set(Object.values(TaskStatus)))
const normalizeTargetType = createEnumNormalizer(new Set(Object.values(TargetType)))

type TaskListRequest = FastifyRequest<{ Querystring: TaskListQuery }>

const resolveTaskListContext = (
  request: TaskListRequest,
  reply: FastifyReply,
  options?: { targetType?: TargetType; targetId?: string }
) => {
  const user = requireRequestUser(request, reply)
  if (!user) return null

  const filters = parseTaskListFilters(request.query)
  if (!filters.ok) {
    void reply.code(400).send(badRequest(filters.error))
    return null
  }

  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize
  )

  const assigneeId = resolveTaskAssigneeFilter(user, request.query.assigneeId)
  const where = buildTaskWhere(filters, {
    assigneeId,
    targetType: options?.targetType ?? filters.targetType,
    targetId: options?.targetId ?? request.query.targetId,
  })

  return { page, pageSize, skip, where }
}

const listTasksForTarget = async (
  targetType: TargetType,
  request: FastifyRequest<{ Params: { id: string }; Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  const context = resolveTaskListContext(request, reply, {
    targetType,
    targetId: request.params.id,
  })
  if (!context) return
  return listTasks(context.where, context.page, context.pageSize, context.skip)
}

export const listTasksHandler = async (
  request: FastifyRequest<{ Querystring: TaskListQuery }>,
  reply: FastifyReply
) => {
  const context = resolveTaskListContext(request, reply)
  if (!context) return
  return listTasks(context.where, context.page, context.pageSize, context.skip)
}

export const getTaskHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const user = requireRequestUser(request, reply)
  if (!user) return

  const where: Prisma.TaskWhereInput = { id: request.params.id }
  if (!canManageAllTasks(user)) {
    where.assigneeId = user.userId
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
  const user = requireRequestUser(request, reply)
  if (!user) return

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
    const target = await ensureTaskTargetExists(normalizedTargetType, targetId)
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
        assigneeId: assigneeId ?? user.userId,
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
  const user = requireRequestUser(request, reply)
  if (!user) return

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
      ...buildTaskOwnershipFilter(user),
    },
  })
  if (!existing) {
    return reply.code(404).send(notFound('Task'))
  }

  const data = buildTaskUpdateData({
    title,
    description,
    status,
    assigneeId,
    dueDate: dueDate ?? null,
    updateDueDate: request.body.dueDate !== undefined,
  })

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
  const user = requireRequestUser(request, reply)
  if (!user) return

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
      ...buildTaskOwnershipFilter(user),
    },
    select: { id: true },
  })
  if (existingTasks.length !== taskIds.length) {
    return reply.code(404).send(notFound('Task'))
  }

  const updates = taskIds.map((taskId) => {
    const data = buildTaskUpdateData({
      status,
      assigneeId,
      dueDate: dueDate ?? null,
      updateDueDate: request.body.dueDate !== undefined,
    })
    return prisma.task.update({ where: { id: taskId }, data })
  })

  await prisma.$transaction(updates)

  return { updated: updates.length }
}

export const deleteTaskHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const user = requireRequestUser(request, reply)
  if (!user) return

  const existing = await prisma.task.findFirst({
    where: {
      id: request.params.id,
      ...buildTaskOwnershipFilter(user),
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
  const context = resolveTaskListContext(request, reply)
  if (!context) return
  return listTasks(context.where, context.page, context.pageSize, context.skip)
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
