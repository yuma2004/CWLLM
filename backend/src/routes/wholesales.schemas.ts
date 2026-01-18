import { WholesaleStatus } from '@prisma/client'
import { z } from 'zod'
import { idParamsSchema, paginationQuerySchema } from './shared/schemas'

export interface WholesaleCreateBody {
  projectId: string
  companyId: string
  conditions?: string
  unitPrice?: number
  margin?: number
  status?: WholesaleStatus
  agreedDate?: string
  ownerId?: string
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
}

export interface WholesaleListQuery {
  projectId?: string
  companyId?: string
  status?: string
  page?: string
  pageSize?: string
}

export const wholesaleListQuerySchema = z
  .object({
    projectId: z.string().optional(),
    companyId: z.string().optional(),
    status: z.nativeEnum(WholesaleStatus).optional(),
  })
  .merge(paginationQuerySchema)

export const wholesaleParamsSchema = idParamsSchema

export const wholesaleCreateBodySchema = z.object({
  projectId: z.string().min(1),
  companyId: z.string().min(1),
  conditions: z.string().optional(),
  unitPrice: z.number().optional(),
  margin: z.number().optional(),
  status: z.nativeEnum(WholesaleStatus).optional(),
  agreedDate: z.string().optional(),
  ownerId: z.string().optional(),
})

export const wholesaleUpdateBodySchema = z.object({
  projectId: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  conditions: z.string().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  margin: z.number().nullable().optional(),
  status: z.nativeEnum(WholesaleStatus).optional(),
  agreedDate: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
})
