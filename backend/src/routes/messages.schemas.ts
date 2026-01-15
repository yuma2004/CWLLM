import { z } from 'zod'
import { dateSchema, paginationSchema } from './shared/schemas'

export interface MessageListQuery {
  page?: string
  pageSize?: string
  from?: string
  to?: string
  label?: string
}

export interface MessageSearchQuery {
  q?: string
  messageId?: string
  companyId?: string
  page?: string
  pageSize?: string
  from?: string
  to?: string
  label?: string
}

export interface UnassignedQuery {
  q?: string
  page?: string
  pageSize?: string
}

export interface AssignBody {
  companyId: string
}

export interface LabelBody {
  label: string
}

export interface LabelListQuery {
  limit?: string
}

export interface BulkAssignBody {
  messageIds: string[]
  companyId: string
}

export interface BulkLabelBody {
  messageIds: string[]
  label: string
}

export const messageSchema = z
  .object({
    id: z.string(),
    chatworkRoomId: z.string().optional(),
    roomId: z.string(),
    messageId: z.string(),
    sender: z.string(),
    body: z.string(),
    sentAt: dateSchema.optional(),
    labels: z.array(z.string()).optional(),
    companyId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    wholesaleId: z.string().nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

export const messageListQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  label: z.string().optional(),
})

export const messageSearchQuerySchema = z.object({
  q: z.string().optional(),
  messageId: z.string().optional(),
  companyId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  label: z.string().optional(),
})

export const messageUnassignedQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

export const messageAssignBodySchema = z.object({
  companyId: z.string().min(1),
})

export const messageLabelBodySchema = z.object({
  label: z.string().min(1),
})

export const messageBulkAssignBodySchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  companyId: z.string().min(1),
})

export const messageBulkLabelBodySchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  label: z.string().min(1),
})

export const messageLabelListQuerySchema = z.object({
  limit: z.string().optional(),
})

export const messageParamsSchema = z.object({ id: z.string().min(1) })
export const messageLabelParamsSchema = z.object({ id: z.string().min(1), label: z.string() })

export const messageListResponseSchema = z
  .object({
    items: z.array(messageSchema),
    pagination: paginationSchema,
  })
  .passthrough()

export const messageResponseSchema = z.object({ message: messageSchema }).passthrough()
export const messageBulkResponseSchema = z.object({ updated: z.number() }).passthrough()

export const messageLabelListResponseSchema = z
  .object({
    items: z.array(
      z
        .object({
          label: z.string(),
          count: z.number(),
        })
        .passthrough()
    ),
  })
  .passthrough()
