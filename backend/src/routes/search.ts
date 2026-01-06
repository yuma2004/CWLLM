import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/rbac'
import { prisma } from '../utils/prisma'
import { normalizeCompanyName } from '../utils/normalize'

interface SearchQuery {
  q?: string
  limit?: string
}

const parseLimit = (value?: string) => {
  const limitValue = Number(value)
  if (!Number.isFinite(limitValue)) return 5
  return Math.min(Math.max(Math.floor(limitValue), 1), 20)
}

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: SearchQuery }>(
    '/search',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const rawQuery = request.query.q?.trim() ?? ''
      if (!rawQuery) {
        return reply.code(400).send({ error: 'q is required' })
      }

      const limit = parseLimit(request.query.limit)
      const normalized = normalizeCompanyName(rawQuery)

      const [companies, projects, wholesales, tasks, contacts] = await prisma.$transaction([
        prisma.company.findMany({
          where: {
            OR: [
              { name: { contains: rawQuery, mode: 'insensitive' } },
              { normalizedName: { contains: normalized } },
            ],
          },
          orderBy: { name: 'asc' },
          take: limit,
          select: {
            id: true,
            name: true,
            status: true,
            category: true,
          },
        }),
        prisma.project.findMany({
          where: { name: { contains: rawQuery, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            company: { select: { id: true, name: true } },
          },
        }),
        prisma.wholesale.findMany({
          where: {
            OR: [
              { company: { name: { contains: rawQuery, mode: 'insensitive' } } },
              { project: { name: { contains: rawQuery, mode: 'insensitive' } } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            company: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            OR: [
              { title: { contains: rawQuery, mode: 'insensitive' } },
              { description: { contains: rawQuery, mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            title: true,
            status: true,
            targetType: true,
            targetId: true,
            dueDate: true,
          },
        }),
        prisma.contact.findMany({
          where: {
            OR: [
              { name: { contains: rawQuery, mode: 'insensitive' } },
              { email: { contains: rawQuery, mode: 'insensitive' } },
              { phone: { contains: rawQuery, mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            company: { select: { id: true, name: true } },
          },
        }),
      ])

      return {
        query: rawQuery,
        companies,
        projects,
        wholesales,
        tasks,
        contacts,
      }
    }
  )
}
