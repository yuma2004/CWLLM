import { z } from 'zod'

export interface SearchQuery {
  q: string
  limit: number
}

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(5),
})
