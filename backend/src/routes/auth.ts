import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { env } from '../config/env'
import { buildLoginHandler, logoutHandler, meHandler } from './auth.handlers'
import { LoginBody, loginBodySchema } from './auth.schemas'

export async function authRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        body: loginBodySchema,
      },
      config: {
        rateLimit: {
          max: env.rateLimitMax,
          timeWindow: env.rateLimitWindowMs,
        },
      },
    },
    buildLoginHandler(fastify)
  )

  app.post('/auth/logout', logoutHandler)
  app.get('/auth/me', meHandler)
}
