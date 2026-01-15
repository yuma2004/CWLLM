import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import {
  addMessageLabelHandler,
  assignCompanyHandler,
  bulkAddLabelsHandler,
  bulkAssignCompanyHandler,
  bulkRemoveLabelsHandler,
  listCompanyMessagesHandler,
  listMessageLabelsHandler,
  listUnassignedMessagesHandler,
  removeMessageLabelHandler,
  searchMessagesHandler,
} from './messages.handlers'
import {
  AssignBody,
  BulkAssignBody,
  BulkLabelBody,
  LabelBody,
  LabelListQuery,
  MessageListQuery,
  MessageSearchQuery,
  UnassignedQuery,
  messageAssignBodySchema,
  messageBulkAssignBodySchema,
  messageBulkLabelBodySchema,
  messageBulkResponseSchema,
  messageLabelBodySchema,
  messageLabelListQuerySchema,
  messageLabelListResponseSchema,
  messageLabelParamsSchema,
  messageListQuerySchema,
  messageListResponseSchema,
  messageParamsSchema,
  messageResponseSchema,
  messageSearchQuerySchema,
  messageUnassignedQuerySchema,
} from './messages.schemas'

export async function messageRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Params: { id: string }; Querystring: MessageListQuery }>(
    '/companies/:id/messages',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        params: messageParamsSchema,
        querystring: messageListQuerySchema,
        response: {
          200: messageListResponseSchema,
        },
      },
    },
    listCompanyMessagesHandler
  )

  app.get<{ Querystring: MessageSearchQuery }>(
    '/messages/search',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        querystring: messageSearchQuerySchema,
        response: {
          200: messageListResponseSchema,
        },
      },
    },
    searchMessagesHandler
  )

  app.get<{ Querystring: UnassignedQuery }>(
    '/messages/unassigned',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        querystring: messageUnassignedQuerySchema,
        response: {
          200: messageListResponseSchema,
        },
      },
    },
    listUnassignedMessagesHandler
  )

  app.patch<{ Params: { id: string }; Body: AssignBody }>(
    '/messages/:id/assign-company',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        params: messageParamsSchema,
        body: messageAssignBodySchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
    assignCompanyHandler
  )

  app.patch<{ Body: BulkAssignBody }>(
    '/messages/assign-company',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        body: messageBulkAssignBodySchema,
        response: {
          200: messageBulkResponseSchema,
        },
      },
    },
    bulkAssignCompanyHandler
  )

  app.post<{ Params: { id: string }; Body: LabelBody }>(
    '/messages/:id/labels',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        params: messageParamsSchema,
        body: messageLabelBodySchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
    addMessageLabelHandler
  )

  app.delete<{ Params: { id: string; label: string } }>(
    '/messages/:id/labels/:label',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        params: messageLabelParamsSchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
    removeMessageLabelHandler
  )

  app.post<{ Body: BulkLabelBody }>(
    '/messages/labels/bulk',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        body: messageBulkLabelBodySchema,
        response: {
          200: messageBulkResponseSchema,
        },
      },
    },
    bulkAddLabelsHandler
  )

  app.post<{ Body: BulkLabelBody }>(
    '/messages/labels/bulk/remove',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Messages'],
        body: messageBulkLabelBodySchema,
        response: {
          200: messageBulkResponseSchema,
        },
      },
    },
    bulkRemoveLabelsHandler
  )

  app.get<{ Querystring: LabelListQuery }>(
    '/messages/labels',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Messages'],
        querystring: messageLabelListQuerySchema,
        response: {
          200: messageLabelListResponseSchema,
        },
      },
    },
    listMessageLabelsHandler
  )
}
