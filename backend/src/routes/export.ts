import { FastifyInstance } from 'fastify'
import { Prisma, TaskStatus, TargetType } from '@prisma/client'
import { requireAdmin } from '../middleware/rbac'
import { prisma } from '../utils/prisma'
import { parseDate } from '../utils/validation'

interface CompanyExportQuery {
  from?: string
  to?: string
  status?: string
  category?: string
  ownerId?: string
  tag?: string
}

interface TaskExportQuery {
  status?: string
  targetType?: string
  targetId?: string
  assigneeId?: string
  dueFrom?: string
  dueTo?: string
}

const TASK_STATUSES = new Set(Object.values(TaskStatus))
const TARGET_TYPES = new Set(Object.values(TargetType))

const normalizeTaskStatus = (value?: string) => {
  if (value === undefined) return undefined
  if (!TASK_STATUSES.has(value as TaskStatus)) return null
  return value as TaskStatus
}

const normalizeTargetType = (value?: string) => {
  if (value === undefined) return undefined
  if (!TARGET_TYPES.has(value as TargetType)) return null
  return value as TargetType
}

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

const toCsv = (rows: Array<Array<string | number | null | undefined>>) => {
  const lines = rows.map((row) =>
    row
      .map((cell) => {
        if (cell === null || cell === undefined) return '""'
        return escapeCsv(String(cell))
      })
      .join(',')
  )
  return `\ufeff${lines.join('\n')}`
}

export async function exportRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: CompanyExportQuery }>(
    '/export/companies.csv',
    { preHandler: requireAdmin() },
    async (request, reply) => {
      const fromDate = parseDate(request.query.from)
      const toDate = parseDate(request.query.to)
      if (request.query.from && !fromDate) {
        return reply.code(400).send({ error: 'Invalid from date' })
      }
      if (request.query.to && !toDate) {
        return reply.code(400).send({ error: 'Invalid to date' })
      }

      const where: Prisma.CompanyWhereInput = {}
      if (request.query.status) {
        where.status = request.query.status
      }
      if (request.query.category) {
        where.category = request.query.category
      }
      if (request.query.ownerId) {
        where.ownerId = request.query.ownerId
      }
      if (request.query.tag) {
        where.tags = { has: request.query.tag }
      }
      if (fromDate || toDate) {
        where.createdAt = {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {}),
        }
      }

      const companies = await prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

    const csv = toCsv([
      ['id', 'name', 'category', 'status', 'tags', 'profile', 'ownerId', 'createdAt', 'updatedAt'],
      ...companies.map((company) => [
        company.id,
        company.name,
        company.category ?? '',
        company.status,
        (company.tags ?? []).join(';'),
        company.profile ?? '',
        company.ownerId ?? '',
        company.createdAt.toISOString(),
        company.updatedAt.toISOString(),
      ]),
    ])

      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="companies.csv"')
        .send(csv)
    }
  )

  fastify.get<{ Querystring: TaskExportQuery }>(
    '/export/tasks.csv',
    { preHandler: requireAdmin() },
    async (request, reply) => {
      const status = normalizeTaskStatus(request.query.status)
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

      const tasks = await prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

    const csv = toCsv([
      [
        'id',
        'targetType',
        'targetId',
        'title',
        'description',
        'dueDate',
        'status',
        'assigneeId',
        'createdAt',
        'updatedAt',
      ],
      ...tasks.map((task) => [
        task.id,
        task.targetType,
        task.targetId,
        task.title,
        task.description ?? '',
        task.dueDate ? task.dueDate.toISOString() : '',
        task.status,
        task.assigneeId ?? '',
        task.createdAt.toISOString(),
        task.updatedAt.toISOString(),
      ]),
    ])

      reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="tasks.csv"')
        .send(csv)
    }
  )
}
