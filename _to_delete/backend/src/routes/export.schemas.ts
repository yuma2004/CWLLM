import { TaskStatus, TargetType } from '@prisma/client'
import { z } from 'zod'

export interface CompanyExportQuery {
  from?: string
  to?: string
  status?: string
  category?: string
  ownerId?: string
  tag?: string
}

export interface TaskExportQuery {
  status?: TaskStatus
  targetType?: TargetType
  targetId?: string
  assigneeId?: string
  dueFrom?: string
  dueTo?: string
}

export const companyExportQuerySchema = z.object({
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  ownerId: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
})

export const taskExportQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  targetType: z.nativeEnum(TargetType).optional(),
  targetId: z.string().min(1).optional(),
  assigneeId: z.string().min(1).optional(),
  dueFrom: z.string().min(1).optional(),
  dueTo: z.string().min(1).optional(),
})
