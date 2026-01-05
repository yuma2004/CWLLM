import { FastifyInstance } from 'fastify'
import { auditLogRoutes } from './audit-logs'
import { authRoutes } from './auth'
import { chatworkRoutes } from './chatwork'
import { companyRoutes } from './companies'
import { dashboardRoutes } from './dashboard'
import { exportRoutes } from './export'
import { messageRoutes } from './messages'
import { projectRoutes } from './projects'
import { settingRoutes } from './settings'
import { summaryRoutes } from './summaries'
import { taskRoutes } from './tasks'
import { userRoutes } from './users'
import { wholesaleRoutes } from './wholesales'

const ROUTES = [
  authRoutes,
  userRoutes,
  companyRoutes,
  chatworkRoutes,
  messageRoutes,
  taskRoutes,
  projectRoutes,
  wholesaleRoutes,
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
