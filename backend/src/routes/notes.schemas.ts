import { NoteType, TaskStatus } from '@prisma/client'
import { z } from 'zod'
import { idParamsSchema, paginationQuerySchema } from './shared/schemas'

const optionalStringSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().optional()
)

export const noteTargetTypeSchema = z.enum(['company', 'project', 'wholesale'])
export type NoteTargetType = z.infer<typeof noteTargetTypeSchema>

export interface NoteCreateBody {
  targetType: NoteTargetType
  targetId: string
  type?: NoteType
  content: string
  authorId?: string
}

export interface NoteUpdateBody {
  type?: NoteType
  content?: string
}

export interface NoteListQuery {
  targetType?: string
  targetId?: string
  type?: string
  authorId?: string
  q?: string
  page?: string
  pageSize?: string
}

export interface NoteToTaskBody {
  title?: string
  description?: string
  dueDate?: string | null
  assigneeId?: string | null
  status?: TaskStatus
}

export const noteParamsSchema = idParamsSchema

export const noteCreateBodySchema = z.object({
  targetType: noteTargetTypeSchema,
  targetId: z.string().min(1),
  type: z.nativeEnum(NoteType).optional(),
  content: z.string().min(1),
  authorId: optionalStringSchema,
})

export const noteUpdateBodySchema = z.object({
  type: z.nativeEnum(NoteType).optional(),
  content: z.string().min(1).optional(),
})

export const noteListQuerySchema = z
  .object({
    targetType: noteTargetTypeSchema.optional(),
    targetId: z.string().optional(),
    type: z.nativeEnum(NoteType).optional(),
    authorId: z.string().optional(),
    q: z.string().optional(),
  })
  .merge(paginationQuerySchema)

export const noteToTaskBodySchema = z.object({
  title: optionalStringSchema,
  description: optionalStringSchema,
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
})
