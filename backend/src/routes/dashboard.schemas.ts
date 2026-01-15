import { z } from 'zod'

export const dashboardResponseSchema = z.object({
  overdueTasks: z.array(z.any()),
  todayTasks: z.array(z.any()),
  soonTasks: z.array(z.any()),
  weekTasks: z.array(z.any()),
  latestSummaries: z.array(z.any()),
  recentCompanies: z.array(z.any()),
  unassignedMessageCount: z.number(),
})
