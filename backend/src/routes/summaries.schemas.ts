import { SummaryType } from '@prisma/client'
import { z } from 'zod'
import { apiErrorSchema, dateSchema, idParamsSchema } from './shared/schemas'

export const summaryCreateBodySchema = z.object({
  content: z.string(),
  type: z.string().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  sourceLinks: z.array(z.string()).optional(),
})

export type SummaryCreateBody = z.infer<typeof summaryCreateBodySchema>

export const summaryCompanyParamsSchema = idParamsSchema
export const summaryParamsSchema = idParamsSchema

export const summarySchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    content: z.string(),
    type: z.nativeEnum(SummaryType),
    periodStart: dateSchema,
    periodEnd: dateSchema,
    sourceLinks: z.array(z.string()).optional(),
  })
  .passthrough()

export const summaryResponseSchema = z.object({ summary: summarySchema }).passthrough()
export const summariesResponseSchema = z.object({ summaries: z.array(summarySchema) }).passthrough()

export const summaryCandidateSchema = z.object({
  title: z.string(),
  dueDate: z.string().optional(),
})

export const summaryCandidatesResponseSchema = z
  .object({ candidates: z.array(summaryCandidateSchema) })
  .passthrough()

export const summaryErrorResponses = {
  400: apiErrorSchema,
  401: apiErrorSchema,
  404: apiErrorSchema,
} as const
