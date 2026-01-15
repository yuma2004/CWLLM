import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAdmin, requireAuth, requireWriteAccess } from '../middleware/rbac'
import { apiErrorSchema } from './shared/schemas'
import {
  chatworkCompanyRoomsResponseSchema,
  chatworkJobResponseSchema,
  chatworkLinkResponseSchema,
  chatworkMessageSyncQuerySchema,
  chatworkRoomLinkBodySchema,
  chatworkRoomLinkParamsSchema,
  chatworkRoomParamsSchema,
  chatworkRoomResponseSchema,
  chatworkRoomToggleBodySchema,
  chatworkRoomsResponseSchema,
} from './chatwork.schemas'
import {
  createCompanyChatworkRoomLinkHandler,
  deleteCompanyChatworkRoomLinkHandler,
  listChatworkRoomsHandler,
  listCompanyChatworkRoomsHandler,
  syncChatworkMessagesHandler,
  syncChatworkRoomsHandler,
  toggleChatworkRoomHandler,
} from './chatwork.handlers'
import type { MessageSyncQuery, RoomLinkBody, RoomToggleBody } from './chatwork.schemas'

export async function chatworkRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get(
    '/chatwork/rooms',
    {
      preHandler: requireAdmin(),
      schema: {
        response: {
          200: chatworkRoomsResponseSchema,
        },
      },
    },
    listChatworkRoomsHandler
  )

  app.post(
    '/chatwork/rooms/sync',
    {
      preHandler: requireAdmin(),
      schema: {
        response: {
          200: chatworkJobResponseSchema,
          400: apiErrorSchema,
        },
      },
    },
    syncChatworkRoomsHandler
  )

  app.patch<{ Params: { id: string }; Body: RoomToggleBody }>(
    '/chatwork/rooms/:id',
    {
      preHandler: requireAdmin(),
      schema: {
        params: chatworkRoomParamsSchema,
        body: chatworkRoomToggleBodySchema,
        response: {
          200: chatworkRoomResponseSchema,
        },
      },
    },
    toggleChatworkRoomHandler
  )

  app.post<{ Querystring: MessageSyncQuery }>(
    '/chatwork/messages/sync',
    {
      preHandler: requireAdmin(),
      schema: {
        querystring: chatworkMessageSyncQuerySchema,
        response: {
          200: chatworkJobResponseSchema,
          400: apiErrorSchema,
        },
      },
    },
    syncChatworkMessagesHandler
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id/chatwork-rooms',
    {
      preHandler: requireAuth(),
      schema: {
        params: chatworkRoomParamsSchema,
        response: {
          200: chatworkCompanyRoomsResponseSchema,
        },
      },
    },
    listCompanyChatworkRoomsHandler
  )

  app.post<{ Params: { id: string }; Body: RoomLinkBody }>(
    '/companies/:id/chatwork-rooms',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: chatworkRoomParamsSchema,
        body: chatworkRoomLinkBodySchema,
        response: {
          201: chatworkLinkResponseSchema,
        },
      },
    },
    createCompanyChatworkRoomLinkHandler
  )

  app.delete<{ Params: { id: string; roomId: string } }>(
    '/companies/:id/chatwork-rooms/:roomId',
    {
      preHandler: requireWriteAccess(),
      schema: {
        params: chatworkRoomLinkParamsSchema,
        response: {
          204: z.null(),
        },
      },
    },
    deleteCompanyChatworkRoomLinkHandler
  )
}
