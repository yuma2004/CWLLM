import { JobStatus, JobType } from '@prisma/client'
import { z } from 'zod'
import { dateSchema } from './shared/schemas'

export interface JobListQuery {
  type?: JobType
  status?: JobStatus
  limit: number
}

export const jobSchema = z
  .object({
    id: z.string(),
    type: z.nativeEnum(JobType),
    status: z.nativeEnum(JobStatus),
    payload: z.unknown(),
    result: z.unknown().nullable().optional(),
    error: z.unknown().nullable().optional(),
    userId: z.string().nullable().optional(),
    startedAt: dateSchema.nullable().optional(),
    finishedAt: dateSchema.nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

export const jobListQuerySchema = z.object({
  type: z.nativeEnum(JobType).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const jobParamsSchema = z.object({ id: z.string().min(1) })

export const jobListResponseSchema = z
  .object({
    jobs: z.array(jobSchema),
  })
  .passthrough()

export const jobResponseSchema = z.object({ job: jobSchema }).passthrough()
