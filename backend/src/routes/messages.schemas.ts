import { z } from 'zod'
import {
  dateSchema,
  paginationQuerySchema,
  paginationSchema,
  timestampsSchema,
} from './shared/schemas'

export const MESSAGE_LABEL_MAX_LENGTH = 30
const labelSchema = z
  .string()
  .trim()
  .min(1)
  .max(MESSAGE_LABEL_MAX_LENGTH)
  .refine((value) => !/[\r\n\t]/.test(value), {
    message: 'Label contains invalid whitespace',
  })

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
  })
  .merge(timestampsSchema)
  .passthrough()

export const messageListQuerySchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    label: z.string().optional(),
  })
  .merge(paginationQuerySchema)

export const messageSearchQuerySchema = z
  .object({
    q: z.string().optional(),
    messageId: z.string().optional(),
    companyId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    label: z.string().optional(),
  })
  .merge(paginationQuerySchema)
  .refine((value) => {
    const query = value.q?.trim()
    return Boolean(query || value.messageId)
  }, {
    message: 'q or messageId is required',
    path: ['q'],
  })

export const messageUnassignedQuerySchema = z
  .object({
    q: z.string().optional(),
  })
  .merge(paginationQuerySchema)

export const messageAssignBodySchema = z.object({
  companyId: z.string().min(1),
})

export const messageLabelBodySchema = z.object({
  label: labelSchema,
})

export const messageBulkAssignBodySchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  companyId: z.string().min(1),
})

export const messageBulkLabelBodySchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
  label: labelSchema,
})

export const messageLabelListQuerySchema = z.object({
  limit: z.string().optional(),
})

export const messageParamsSchema = z.object({ id: z.string().min(1) })
export const messageLabelParamsSchema = z.object({
  id: z.string().min(1),
  label: labelSchema,
})

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
