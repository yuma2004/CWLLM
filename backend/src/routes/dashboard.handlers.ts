import { TaskStatus } from '@prisma/client'
import { attachTargetInfo } from '../services'
import { prisma } from '../utils'

export const getDashboardHandler = async () => {
  const now = new Date()
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
        assignee: { select: { id: true, email: true, name: true } },
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
        assignee: { select: { id: true, email: true, name: true } },
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
        assignee: { select: { id: true, email: true, name: true } },
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
        assignee: { select: { id: true, email: true, name: true } },
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
