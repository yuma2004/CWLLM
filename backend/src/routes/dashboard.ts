import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/rbac'
import { prisma } from '../utils/prisma'

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { preHandler: requireAuth() }, async () => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
    const startOfThreeDays = new Date(startOfToday)
    startOfThreeDays.setDate(startOfThreeDays.getDate() + 4)
    const startOfSevenDays = new Date(startOfToday)
    startOfSevenDays.setDate(startOfSevenDays.getDate() + 8)

    const baseTaskWhere = {
      status: { notIn: ['done', 'cancelled'] },
      dueDate: { not: null },
    }

    const [
      overdueTasks,
      todayTasks,
      soonTasks,
      weekTasks,
      latestSummaries,
      recentCompanies,
      unassignedMessageCount,
    ] = await Promise.all([
      prisma.task.findMany({
        where: {
          ...baseTaskWhere,
          dueDate: { lt: startOfToday },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          ...baseTaskWhere,
          dueDate: { gte: startOfToday, lt: startOfTomorrow },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          ...baseTaskWhere,
          dueDate: { gte: startOfTomorrow, lt: startOfThreeDays },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.task.findMany({
        where: {
          ...baseTaskWhere,
          dueDate: { gte: startOfThreeDays, lt: startOfSevenDays },
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
      prisma.message.count({
        where: { companyId: null },
      }),
    ])

    return {
      overdueTasks,
      todayTasks,
      soonTasks,
      weekTasks,
      latestSummaries,
      recentCompanies,
      unassignedMessageCount,
    }
  })
}
