export interface DashboardTask {
  id: string
  title: string
  dueDate?: string | null
  status: string
  targetType: string
  targetId: string
  target?: {
    id: string
    type: string
    name: string
  }
  assigneeId?: string | null
  assignee?: {
    id: string
    email: string
  } | null
}

export interface DashboardSummary {
  id: string
  companyId: string
  content: string
  type: string
  createdAt: string
  company?: {
    id: string
    name: string
  }
}

export interface DashboardCompany {
  id: string
  name: string
  status: string
  category?: string | null
  updatedAt?: string
}

export interface DashboardResponse {
  overdueTasks: DashboardTask[]
  todayTasks: DashboardTask[]
  soonTasks: DashboardTask[]
  weekTasks: DashboardTask[]
  latestSummaries: DashboardSummary[]
  recentCompanies: DashboardCompany[]
  unassignedMessageCount?: number
}
