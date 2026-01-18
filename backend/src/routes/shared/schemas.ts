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

// Shared query schemas for reuse across routes

/** Common pagination query parameters (page, pageSize as strings for query params) */
export const paginationQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

/** Common ID parameter for route params */
export const idParamsSchema = z.object({ id: z.string().min(1) })

/** Common timestamps schema for entities */
export const timestampsSchema = z.object({
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
})

/** Common sort query parameter */
export const sortQuerySchema = z.object({
  sort: z.string().optional(),
})
