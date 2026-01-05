import { FastifyInstance } from 'fastify'
import { requireAdmin } from '../middleware/rbac'
import { prisma } from '../utils/prisma'

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
  fastify.get('/export/companies.csv', { preHandler: requireAdmin() }, async (_request, reply) => {
    const companies = await prisma.company.findMany({ orderBy: { createdAt: 'desc' } })

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
  })

  fastify.get('/export/tasks.csv', { preHandler: requireAdmin() }, async (_request, reply) => {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } })

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
  })
}
