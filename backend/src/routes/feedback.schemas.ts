import { FeedbackType } from '@prisma/client'
import { z } from 'zod'
import { timestampsSchema } from './shared/schemas'

export interface FeedbackCreateBody {
  type?: FeedbackType
  title?: string
  message: string
  pageUrl?: string
}

export interface FeedbackListQuery {
  type?: FeedbackType
}

export interface FeedbackUpdateBody {
  title?: string
  message?: string
}

export const feedbackCreateBodySchema = z.object({
  type: z.nativeEnum(FeedbackType).optional(),
  title: z.string().max(200).optional(),
  message: z.string().min(1).max(2000),
  pageUrl: z.string().max(2048).optional(),
})

export const feedbackListQuerySchema = z.object({
  type: z.nativeEnum(FeedbackType).optional(),
})

export const feedbackUpdateBodySchema = z
  .object({
    title: z.string().max(200).optional(),
    message: z.string().min(1).max(2000).optional(),
  })
  .refine((data) => data.title !== undefined || data.message !== undefined, {
    message: 'title or message is required',
  })

export const feedbackUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
})

export const feedbackSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    type: z.nativeEnum(FeedbackType),
    title: z.string().nullable().optional(),
    message: z.string(),
    pageUrl: z.string().nullable().optional(),
  })
  .merge(timestampsSchema)
  .passthrough()

export const feedbackWithUserSchema = feedbackSchema.extend({
  user: feedbackUserSchema,
})

export const feedbackResponseSchema = z.object({ feedback: feedbackSchema }).passthrough()

export const feedbackWithUserResponseSchema = z
  .object({ feedback: feedbackWithUserSchema })
  .passthrough()

export const feedbackListResponseSchema = z
  .object({ feedbacks: z.array(feedbackWithUserSchema) })
  .passthrough()
