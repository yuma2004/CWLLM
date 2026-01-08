import { z } from 'zod'

export const dateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string()
)

export const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
