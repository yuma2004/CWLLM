import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/rbac'
import { prisma } from '../utils/prisma'

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: requireAuth() }, async () => {
    const now = new Date()

    const [dueTasks, latestSummaries, recentCompanies] = await Promise.all([
      prisma.task.findMany({
        where: {
          dueDate: { lte: now },
          status: { notIn: ['done', 'cancelled'] },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.summary.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.company.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ])

    return {
      dueTasks,
      latestSummaries,
      recentCompanies,
    }
  })
}
