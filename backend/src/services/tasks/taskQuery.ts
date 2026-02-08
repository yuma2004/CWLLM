import { Prisma, TaskStatus, TargetType } from '@prisma/client'
import { attachTargetInfo } from '../taskTargets'
import {
  buildPaginatedResponse,
  createEnumNormalizer,
  parseDate,
  prisma,
} from '../../utils'
import { TaskListQuery } from '../../routes/tasks.schemas'

const normalizeStatus = createEnumNormalizer(new Set(Object.values(TaskStatus)))
const normalizeTargetType = createEnumNormalizer(new Set(Object.values(TargetType)))

export type TaskListFilterResult =
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

export const TASK_FILTER_ERROR_MESSAGES = {
  status: 'Invalid status',
  targetType: 'Invalid targetType',
  dueFrom: 'Invalid dueFrom date',
  dueTo: 'Invalid dueTo date',
}

export const parseTaskListFilters = (query: TaskListQuery): TaskListFilterResult => {
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

export const buildTaskWhere = (
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

export const listTasks = async (
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
