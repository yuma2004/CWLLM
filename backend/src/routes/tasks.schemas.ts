import { TaskStatus, TargetType } from '@prisma/client'
import { z } from 'zod'
import {
  dateSchema,
  idParamsSchema,
  paginationQuerySchema,
  paginationSchema,
  timestampsSchema,
} from './shared/schemas'

export interface TaskCreateBody {
  targetType: TargetType
  targetId: string
  title: string
  description?: string
  dueDate?: string
  assigneeId?: string
  status?: TaskStatus
}

export interface TaskUpdateBody {
  title?: string
  description?: string | null
  dueDate?: string | null
  assigneeId?: string | null
  status?: TaskStatus
}

export interface TaskBulkUpdateBody {
  taskIds: string[]
  dueDate?: string | null
  assigneeId?: string | null
  status?: TaskStatus
}

export interface TaskListQuery {
  status?: string
  assigneeId?: string
  targetType?: string
  targetId?: string
  dueFrom?: string
  dueTo?: string
  page?: string
  pageSize?: string
}

export const taskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    status: z.nativeEnum(TaskStatus),
    dueDate: dateSchema.nullable().optional(),
    targetType: z.nativeEnum(TargetType),
    targetId: z.string(),
    target: z
      .object({
        id: z.string(),
        type: z.nativeEnum(TargetType),
        name: z.string(),
      })
      .optional(),
    assigneeId: z.string().nullable().optional(),
    assignee: z
      .object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .merge(timestampsSchema)
  .passthrough()

export const taskListQuerySchema = z
  .object({
    status: z.nativeEnum(TaskStatus).optional(),
    assigneeId: z.string().optional(),
    targetType: z.nativeEnum(TargetType).optional(),
    targetId: z.string().optional(),
    dueFrom: z.string().optional(),
    dueTo: z.string().optional(),
  })
  .merge(paginationQuerySchema)

export const taskParamsSchema = idParamsSchema

export const taskCreateBodySchema = z.object({
  targetType: z.nativeEnum(TargetType),
  targetId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
})

export const taskUpdateBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
})

export const taskBulkUpdateBodySchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
})

export const taskResponseSchema = z.object({ task: taskSchema }).passthrough()
export const taskListResponseSchema = z
  .object({
    items: z.array(taskSchema),
    pagination: paginationSchema,
  })
  .passthrough()
export const taskBulkUpdateResponseSchema = z.object({ updated: z.number() }).passthrough()

