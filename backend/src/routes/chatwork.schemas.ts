import { z } from 'zod'

export interface RoomToggleBody {
  isActive: boolean
}

export interface RoomLinkBody {
  roomId?: string
  chatworkRoomId?: string
}

export interface MessageSyncQuery {
  roomId?: string
}

export type ChatworkWebhookBody = string

const chatworkRoomSchema = z
  .object({
    id: z.string(),
    roomId: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    lastSyncAt: z.string().datetime().nullable().optional(),
    lastMessageId: z.string().nullable().optional(),
    lastErrorAt: z.string().datetime().nullable().optional(),
    lastErrorMessage: z.string().nullable().optional(),
    lastErrorStatus: z.number().int().nullable().optional(),
    isActive: z.boolean().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .passthrough()

const chatworkLinkedRoomSchema = z
  .object({
    id: z.string(),
    roomId: z.string(),
    name: z.string(),
    isActive: z.boolean(),
  })
  .passthrough()

const companyRoomLinkSchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    chatworkRoomId: z.string(),
    createdAt: z.string().datetime().optional(),
  })
  .passthrough()

export const chatworkWebhookPayloadSchema = z
  .object({
    chatwork_webhook_signature: z.string().optional(),
    webhook_event_type: z.string().optional(),
    webhook_event: z
      .object({
        room_id: z.union([z.string(), z.number()]).optional(),
        roomId: z.union([z.string(), z.number()]).optional(),
        room: z
          .object({
            room_id: z.union([z.string(), z.number()]).optional(),
            roomId: z.union([z.string(), z.number()]).optional(),
          })
          .optional(),
      })
      .optional(),
    room_id: z.union([z.string(), z.number()]).optional(),
    roomId: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough()

export type ChatworkWebhookPayload = z.infer<typeof chatworkWebhookPayloadSchema>

export const chatworkRoomParamsSchema = z.object({ id: z.string().min(1) })
export const chatworkRoomLinkParamsSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
})

export const chatworkRoomToggleBodySchema = z.object({ isActive: z.boolean() })

export const chatworkRoomLinkBodySchema = z.object({
  roomId: z.string().min(1).optional(),
  chatworkRoomId: z.string().min(1).optional(),
})
  .refine((data) => data.roomId || data.chatworkRoomId, {
    message: 'roomId is required',
  })

export const chatworkMessageSyncQuerySchema = z.object({
  roomId: z.string().min(1).optional(),
})

export const chatworkWebhookBodySchema = z.string()

export const chatworkRoomsResponseSchema = z.object({
  rooms: z.array(chatworkRoomSchema),
})
export const chatworkJobResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
})
export const chatworkRoomResponseSchema = z.object({ room: chatworkRoomSchema })
export const chatworkCompanyRoomsResponseSchema = z.object({
  rooms: z.array(chatworkLinkedRoomSchema),
})
export const chatworkLinkResponseSchema = z.object({ link: companyRoomLinkSchema })
export const chatworkWebhookResponseSchema = z.object({
  status: z.string(),
  enqueued: z.boolean().optional(),
  jobId: z.string().optional(),
  reason: z.string().optional(),
})
