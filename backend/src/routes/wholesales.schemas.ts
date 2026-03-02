import { DealStatus, WholesaleStatus } from '@prisma/client'
import { z } from 'zod'
import {
  apiErrorSchema,
  idParamsSchema,
  paginationQuerySchema,
  paginationSchema,
} from './shared/schemas'

const optionalNumberSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.number().optional()
)
const optionalStringSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().optional()
)

export interface WholesaleCreateBody {
  projectId: string
  companyId: string
  conditions?: string
  unitPrice?: number
  margin?: number
  status?: WholesaleStatus
  agreedDate?: string
  ownerId?: string
  dealStatus?: DealStatus
  proposedUnitPrice?: number
  agreedUnitPrice?: number
  nextActionAt?: string
  specialConditions?: string
}

export interface WholesaleUpdateBody {
  projectId?: string
  companyId?: string
  conditions?: string | null
  unitPrice?: number | null
  margin?: number | null
  status?: WholesaleStatus
  agreedDate?: string | null
  ownerId?: string | null
  dealStatus?: DealStatus
  proposedUnitPrice?: number | null
  agreedUnitPrice?: number | null
  nextActionAt?: string | null
  specialConditions?: string | null
}

export interface WholesaleListQuery {
  projectId?: string
  companyId?: string
  status?: string
  dealStatus?: string
  ownerId?: string
  unitPriceMin?: string
  unitPriceMax?: string
  page?: string
  pageSize?: string
}

export interface WholesaleNegotiationCreateBody {
  actorId?: string
  offeredUnitPrice?: number
  agreedUnitPrice?: number
  note?: string
  actionAt?: string
}

export const wholesaleListQuerySchema = z
  .object({
    projectId: z.string().optional(),
    companyId: z.string().optional(),
    status: z.string().optional(),
    dealStatus: z.string().optional(),
    ownerId: z.string().optional(),
    unitPriceMin: z.string().optional(),
    unitPriceMax: z.string().optional(),
  })
  .merge(paginationQuerySchema)

export const wholesaleParamsSchema = idParamsSchema

export const wholesaleCreateBodySchema = z.object({
  projectId: z.string().min(1),
  companyId: z.string().min(1),
  conditions: optionalStringSchema,
  unitPrice: optionalNumberSchema,
  margin: optionalNumberSchema,
  status: z.string().optional(),
  agreedDate: optionalStringSchema,
  ownerId: optionalStringSchema,
  dealStatus: z.string().optional(),
  proposedUnitPrice: optionalNumberSchema,
  agreedUnitPrice: optionalNumberSchema,
  nextActionAt: optionalStringSchema,
  specialConditions: optionalStringSchema,
})

export const wholesaleUpdateBodySchema = z.object({
  projectId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  conditions: z.string().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  margin: z.number().nullable().optional(),
  status: z.string().optional(),
  agreedDate: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  dealStatus: z.string().optional(),
  proposedUnitPrice: z.number().nullable().optional(),
  agreedUnitPrice: z.number().nullable().optional(),
  nextActionAt: z.string().nullable().optional(),
  specialConditions: z.string().nullable().optional(),
})

export const wholesaleNegotiationCreateBodySchema = z.object({
  actorId: optionalStringSchema,
  offeredUnitPrice: optionalNumberSchema,
  agreedUnitPrice: optionalNumberSchema,
  note: optionalStringSchema,
  actionAt: optionalStringSchema,
})

export const wholesaleSchema = z
  .object({
    id: z.string(),
  })
  .passthrough()

export const wholesaleNegotiationSchema = z
  .object({
    id: z.string(),
  })
  .passthrough()

export const wholesaleResponseSchema = z.object({ wholesale: wholesaleSchema }).passthrough()

export const wholesaleListResponseSchema = z
  .object({
    items: z.array(wholesaleSchema),
    pagination: paginationSchema,
  })
  .passthrough()

export const wholesaleNegotiationsResponseSchema = z
  .object({
    negotiations: z.array(wholesaleNegotiationSchema),
  })
  .passthrough()

export const wholesaleNegotiationResponseSchema = z
  .object({ negotiation: wholesaleNegotiationSchema })
  .passthrough()

export const companyWholesalesResponseSchema = z
  .object({ wholesales: z.array(wholesaleSchema) })
  .passthrough()

export const wholesaleErrorResponses = {
  400: apiErrorSchema,
  401: apiErrorSchema,
  404: apiErrorSchema,
  409: apiErrorSchema,
} as const
