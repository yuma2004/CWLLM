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

export const chatworkMessageSyncQuerySchema = z.object({
  roomId: z.string().min(1).optional(),
})

export const chatworkRoomsResponseSchema = z.object({ rooms: z.array(z.any()) })
export const chatworkJobResponseSchema = z.object({
  jobId: z.string(),
  status: z.string(),
})
export const chatworkRoomResponseSchema = z.object({ room: z.any() })
export const chatworkCompanyRoomsResponseSchema = z.object({ rooms: z.array(z.any()) })
export const chatworkLinkResponseSchema = z.object({ link: z.any() })
