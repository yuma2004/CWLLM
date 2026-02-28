import { FastifyInstance } from 'fastify'
import { env } from '../config/env'
import { authRoutes } from './auth'
import { chatworkRoutes } from './chatwork'
import { companyRoutes } from './companies'
import { dashboardRoutes } from './dashboard'
import { messageRoutes } from './messages'
import { noteRoutes } from './notes'
import { projectRoutes } from './projects'
import { searchRoutes } from './search'
import { summaryRoutes } from './summaries'
import { taskRoutes } from './tasks'
import { testRoutes } from './test'
import { userRoutes } from './users'
import { wholesaleRoutes } from './wholesales'
import { jobRoutes } from './jobs'
import { feedbackRoutes } from './feedback'

const ROUTES = [
  authRoutes,
  userRoutes,
  companyRoutes,
  chatworkRoutes,
  messageRoutes,
  jobRoutes,
  noteRoutes,
  taskRoutes,
  projectRoutes,
  wholesaleRoutes,
  searchRoutes,
  summaryRoutes,
  dashboardRoutes,
  feedbackRoutes,
]

export const registerRoutes = (fastify: FastifyInstance) => {
  const routes = env.nodeEnv === 'test' ? [...ROUTES, testRoutes] : ROUTES
  routes.forEach((route) => {
    fastify.register(route, { prefix: '/api' })
  })
}
