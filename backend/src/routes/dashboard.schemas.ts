import { z } from 'zod'
import { companySchema } from './companies.schemas'
import { taskSchema } from './tasks.schemas'
import { dateSchema } from './shared/schemas'

const dashboardSummarySchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    content: z.string(),
    type: z.string(),
    createdAt: dateSchema.optional(),
    company: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
  })
  .passthrough()

export const dashboardResponseSchema = z.object({
  overdueTasks: z.array(taskSchema),
  todayTasks: z.array(taskSchema),
  soonTasks: z.array(taskSchema),
  weekTasks: z.array(taskSchema),
  latestSummaries: z.array(dashboardSummarySchema),
  recentCompanies: z.array(companySchema),
  unassignedMessageCount: z.number(),
})
