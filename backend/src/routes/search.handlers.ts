import { FastifyRequest } from 'fastify'
import { normalizeCompanyName, prisma } from '../utils'
import type { SearchQuery } from './search.schemas'

export const searchHandler = async (
  request: FastifyRequest<{ Querystring: SearchQuery }>
) => {
  const rawQuery = request.query.q.trim()
  const limit = request.query.limit
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
