import { DashboardCompany, DashboardSummary, DashboardTask } from './entities'

export interface DashboardResponse {
  overdueTasks: DashboardTask[]
  todayTasks: DashboardTask[]
  soonTasks: DashboardTask[]
  weekTasks: DashboardTask[]
  latestSummaries: DashboardSummary[]
  recentCompanies: DashboardCompany[]
  unassignedMessageCount?: number
}
