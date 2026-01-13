import { z } from 'zod'
import { dateSchema, paginationSchema } from './shared/schemas'

export interface CompanyCreateBody {
  name: string
  category?: string
  status?: string
  tags?: string[]
  profile?: string
  ownerId?: string
}

export interface CompanyUpdateBody {
  name?: string
  category?: string | null
  status?: string
  tags?: string[]
  profile?: string | null
  ownerId?: string | null
}

export interface CompanyListQuery {
  q?: string
  category?: string
  status?: string
  tag?: string
  ownerId?: string
  page?: string
  pageSize?: string
}

export interface CompanySearchQuery {
  q?: string
  limit?: string
}

export interface ContactCreateBody {
  name: string
  role?: string
  email?: string
  phone?: string
  memo?: string
}

export interface ContactUpdateBody {
  name?: string
  role?: string | null
  email?: string | null
  phone?: string | null
  memo?: string | null
  sortOrder?: number | null
}

export interface ContactReorderBody {
  orderedIds: string[]
}

export const companySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    normalizedName: z.string().optional(),
    category: z.string().nullable().optional(),
    status: z.string(),
    tags: z.array(z.string()),
    profile: z.string().nullable().optional(),
    ownerId: z.string().nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

export const contactSchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    name: z.string(),
    role: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

export const companyListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
  ownerId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

export const companySearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional(),
})

export const companyCreateBodySchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  profile: z.string().optional(),
  ownerId: z.string().optional(),
})

export const companyUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  profile: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
})

export const contactCreateBodySchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  memo: z.string().optional(),
})

export const contactUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).nullable().optional(),
})

export const contactReorderBodySchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
})

export const companyParamsSchema = z.object({ id: z.string().min(1) })
export const contactParamsSchema = z.object({ id: z.string().min(1) })

export const companyResponseSchema = z.object({ company: companySchema }).passthrough()
export const companyListResponseSchema = z
  .object({
    items: z.array(companySchema),
    pagination: paginationSchema,
  })
  .passthrough()
export const companySearchResponseSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          status: z.string().optional(),
          category: z.string().nullable().optional(),
          tags: z.array(z.string()).optional(),
        })
        .passthrough()
    ),
  })
  .passthrough()

export const contactListResponseSchema = z
  .object({
    contacts: z.array(contactSchema),
  })
  .passthrough()
export const contactResponseSchema = z.object({ contact: contactSchema }).passthrough()

export const companyOptionsResponseSchema = z
  .object({
    categories: z.array(z.string()),
    statuses: z.array(z.string()),
    tags: z.array(z.string()),
  })
  .passthrough()
