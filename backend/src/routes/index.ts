import { FastifyInstance } from 'fastify'
import { auditLogRoutes } from './audit-logs'
import { authRoutes } from './auth'
import { chatworkRoutes } from './chatwork'
import { companyRoutes } from './companies'
import { dashboardRoutes } from './dashboard'
import { exportRoutes } from './export'
import { messageRoutes } from './messages'
import { projectRoutes } from './projects'
import { searchRoutes } from './search'
import { settingRoutes } from './settings'
import { summaryRoutes } from './summaries'
import { taskRoutes } from './tasks'
import { userRoutes } from './users'
import { wholesaleRoutes } from './wholesales'
import { jobRoutes } from './jobs'

const ROUTES = [
  authRoutes,
  userRoutes,
  companyRoutes,
  chatworkRoutes,
  messageRoutes,
  jobRoutes,
  taskRoutes,
  projectRoutes,
  wholesaleRoutes,
  searchRoutes,
  summaryRoutes,
  auditLogRoutes,
  dashboardRoutes,
  settingRoutes,
  exportRoutes,
]

export const registerRoutes = (fastify: FastifyInstance) => {
  ROUTES.forEach((route) => {
    fastify.register(route, { prefix: '/api' })
  })
}
