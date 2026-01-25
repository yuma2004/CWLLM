import { ProjectStatus } from '@prisma/client'
import { z } from 'zod'
import {
  dateSchema,
  idParamsSchema,
  paginationQuerySchema,
  paginationSchema,
  sortQuerySchema,
  timestampsSchema,
} from './shared/schemas'

export interface ProjectCreateBody {
  companyId: string
  name: string
  conditions?: string
  unitPrice?: number
  periodStart?: string
  periodEnd?: string
  status?: ProjectStatus
  ownerId?: string
}

export interface ProjectUpdateBody {
  name?: string
  conditions?: string | null
  unitPrice?: number | null
  periodStart?: string | null
  periodEnd?: string | null
  status?: ProjectStatus
  ownerId?: string | null
}

export interface ProjectListQuery {
  q?: string
  companyId?: string
  status?: string
  sort?: string
  page?: string
  pageSize?: string
}

export interface ProjectSearchQuery {
  q?: string
  companyId?: string
  limit?: string
}

export const projectSchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    name: z.string(),
    conditions: z.string().nullable().optional(),
    unitPrice: z.number().nullable().optional(),
    periodStart: dateSchema.nullable().optional(),
    periodEnd: dateSchema.nullable().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    ownerId: z.string().nullable().optional(),
    company: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
  })
  .merge(timestampsSchema)
  .passthrough()

export const wholesaleSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    companyId: z.string(),
    conditions: z.string().nullable().optional(),
    unitPrice: z.number().nullable().optional(),
    margin: z.number().nullable().optional(),
    status: z.string(),
    agreedDate: dateSchema.nullable().optional(),
    ownerId: z.string().nullable().optional(),
    company: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
    owner: z
      .object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    project: z
      .object({
        id: z.string(),
        name: z.string(),
        company: z
          .object({
            id: z.string(),
            name: z.string(),
          })
          .optional(),
      })
      .optional(),
  })
  .merge(timestampsSchema)
  .passthrough()

export const projectListQuerySchema = z
  .object({
    q: z.string().optional(),
    companyId: z.string().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
  })
  .merge(sortQuerySchema)
  .merge(paginationQuerySchema)

export const projectSearchQuerySchema = z.object({
  q: z.string().min(1),
  companyId: z.string().optional(),
  limit: z.string().optional(),
})

export const projectCreateBodySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  conditions: z.string().optional(),
  unitPrice: z.number().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.string().optional(),
})

export const projectUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  conditions: z.string().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.string().nullable().optional(),
})

export const projectParamsSchema = idParamsSchema

export const projectResponseSchema = z.object({ project: projectSchema }).passthrough()
export const projectListResponseSchema = z
  .object({
    items: z.array(projectSchema),
    pagination: paginationSchema,
  })
  .passthrough()
export const projectSearchResponseSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          companyId: z.string().optional(),
          company: z
            .object({
              id: z.string(),
              name: z.string(),
            })
            .optional(),
        })
        .passthrough()
    ),
  })
  .passthrough()
export const projectWholesalesResponseSchema = z
  .object({
    wholesales: z.array(wholesaleSchema),
  })
  .passthrough()
export const companyProjectsResponseSchema = z
  .object({
    projects: z.array(projectSchema),
  })
  .passthrough()
