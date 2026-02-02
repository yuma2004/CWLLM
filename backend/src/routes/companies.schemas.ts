import { z } from 'zod'
import {
  idParamsSchema,
  paginationQuerySchema,
  paginationSchema,
  timestampsSchema,
} from './shared/schemas'

const trimOptionalString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
  },
  z.string().trim().optional()
)

const trimNullableString = z.preprocess(
  (value) => {
    if (value === null) return null
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  },
  z.string().trim().nullable().optional()
)

const trimRequiredString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string().min(1)
)

const trimStringArray = z.array(z.string().trim())
const trimNonEmptyStringArray = z.array(z.string().trim().min(1))

export interface CompanyCreateBody {
  name: string
  category?: string
  status?: string
  tags?: string[]
  profile?: string
  ownerIds?: string[]
}

export interface CompanyUpdateBody {
  name?: string
  category?: string | null
  status?: string
  tags?: string[]
  profile?: string | null
  ownerIds?: string[]
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

export interface CompanyMergeBody {
  sourceCompanyId: string
}

export const companySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    normalizedName: z.string(),
    category: z.string().nullable(),
    status: z.string(),
    tags: z.array(z.string()),
    profile: z.string().nullable(),
    ownerIds: z.array(z.string()),
  })
  .merge(timestampsSchema)
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
    sortOrder: z.number(),
  })
  .merge(timestampsSchema)
  .passthrough()

export const companyListQuerySchema = z
  .object({
    q: trimOptionalString,
    category: trimOptionalString,
    status: trimOptionalString,
    tag: trimOptionalString,
    ownerId: trimOptionalString,
  })
  .merge(paginationQuerySchema)

export const companySearchQuerySchema = z.object({
  q: trimRequiredString,
  limit: trimOptionalString,
})

export const companyCreateBodySchema = z.object({
  name: trimRequiredString,
  category: trimOptionalString,
  status: trimOptionalString,
  tags: trimStringArray.optional(),
  profile: trimOptionalString,
  ownerIds: trimNonEmptyStringArray.optional(),
})

export const companyUpdateBodySchema = z.object({
  name: trimRequiredString.optional(),
  category: trimNullableString,
  status: trimOptionalString,
  tags: trimStringArray.optional(),
  profile: trimNullableString,
  ownerIds: trimNonEmptyStringArray.optional(),
})

export const contactCreateBodySchema = z.object({
  name: trimRequiredString,
  role: trimOptionalString,
  email: trimOptionalString,
  phone: trimOptionalString,
  memo: trimOptionalString,
})

export const contactUpdateBodySchema = z.object({
  name: trimRequiredString.optional(),
  role: trimNullableString,
  email: trimNullableString,
  phone: trimNullableString,
  memo: trimNullableString,
  sortOrder: z.number().int().min(0).nullable().optional(),
})

export const contactReorderBodySchema = z.object({
  orderedIds: trimNonEmptyStringArray.min(1),
})

export const companyMergeBodySchema = z.object({
  sourceCompanyId: trimRequiredString,
})

export const companyParamsSchema = idParamsSchema
export const contactParamsSchema = idParamsSchema

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
          status: z.string(),
          category: z.string().nullable(),
          tags: z.array(z.string()),
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
