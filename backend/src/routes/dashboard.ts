import { FastifyInstance } from 'fastify'
import { TaskStatus } from '@prisma/client'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth } from '../middleware/rbac'
import { attachTargetInfo } from '../services/taskTargets'
import { prisma } from '../utils/prisma'

export async function dashboardRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  app.get(
    '/dashboard',
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: z.object({
            overdueTasks: z.array(z.any()),
            todayTasks: z.array(z.any()),
            soonTasks: z.array(z.any()),
            weekTasks: z.array(z.any()),
            latestSummaries: z.array(z.any()),
            recentCompanies: z.array(z.any()),
            unassignedMessageCount: z.number(),
          }),
        },
      },
    },
    async () => {
      const now = new Date()
      // today/overdue are calculated in server local time (non-UTC) to preserve existing behavior
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfTomorrow = new Date(startOfToday)
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
      const startOfThreeDays = new Date(startOfToday)
      startOfThreeDays.setDate(startOfThreeDays.getDate() + 4)
      const startOfSevenDays = new Date(startOfToday)
      startOfSevenDays.setDate(startOfSevenDays.getDate() + 8)

      const baseTaskWhere = {
        status: { notIn: [TaskStatus.done, TaskStatus.cancelled] },
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
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            ...baseTaskWhere,
            dueDate: { gte: startOfToday, lt: startOfTomorrow },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            ...baseTaskWhere,
            dueDate: { gte: startOfTomorrow, lt: startOfThreeDays },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          include: {
            assignee: { select: { id: true, email: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            ...baseTaskWhere,
            dueDate: { gte: startOfThreeDays, lt: startOfSevenDays },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          include: {
            assignee: { select: { id: true, email: true } },
          },
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

      const tasksWithTarget = await attachTargetInfo([
        ...overdueTasks,
        ...todayTasks,
        ...soonTasks,
        ...weekTasks,
      ])
      let offset = 0
      const overdueTasksWithTarget = tasksWithTarget.slice(offset, offset + overdueTasks.length)
      offset += overdueTasks.length
      const todayTasksWithTarget = tasksWithTarget.slice(offset, offset + todayTasks.length)
      offset += todayTasks.length
      const soonTasksWithTarget = tasksWithTarget.slice(offset, offset + soonTasks.length)
      offset += soonTasks.length
      const weekTasksWithTarget = tasksWithTarget.slice(offset, offset + weekTasks.length)

      return {
        overdueTasks: overdueTasksWithTarget,
        todayTasks: todayTasksWithTarget,
        soonTasks: soonTasksWithTarget,
        weekTasks: weekTasksWithTarget,
        latestSummaries,
        recentCompanies,
        unassignedMessageCount,
      }
    }
  )
}
