import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth } from '../middleware/rbac'
import {
  FeedbackCreateBody,
  FeedbackListQuery,
  FeedbackUpdateBody,
  feedbackCreateBodySchema,
  feedbackListQuerySchema,
  feedbackResponseSchema,
  feedbackUpdateBodySchema,
  feedbackWithUserResponseSchema,
  feedbackListResponseSchema,
} from './feedback.schemas'
import { createFeedbackHandler, listFeedbackHandler, updateFeedbackHandler } from './feedback.handlers'

export async function feedbackRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.post<{ Body: FeedbackCreateBody }>(
    '/feedback',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Feedback'],
        body: feedbackCreateBodySchema,
        response: {
          201: feedbackResponseSchema,
        },
      },
    },
    createFeedbackHandler
  )

  app.get<{ Querystring: FeedbackListQuery }>(
    '/feedback',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Feedback'],
        querystring: feedbackListQuerySchema,
        response: {
          200: feedbackListResponseSchema,
        },
      },
    },
    listFeedbackHandler
  )

  app.patch<{ Params: { id: string }; Body: FeedbackUpdateBody }>(
    '/feedback/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Feedback'],
        body: feedbackUpdateBodySchema,
        response: {
          200: feedbackWithUserResponseSchema,
        },
      },
    },
    updateFeedbackHandler
  )
}
