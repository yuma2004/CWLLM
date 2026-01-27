import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { dateSchema, idParamsSchema } from './shared/schemas'

export interface CreateUserBody {
  email: string
  name: string
  password: string
  role: UserRole
}

export interface UpdateUserRoleBody {
  role: UserRole
}

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  role: z.nativeEnum(UserRole),
  createdAt: dateSchema.optional(),
})

export const userListResponseSchema = z.object({
  users: z.array(userSchema),
})

export const userResponseSchema = z.object({
  user: userSchema,
})

export const userOptionsResponseSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string().nullable().optional(),
      role: z.nativeEnum(UserRole),
    })
  ),
})

export const createUserBodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
})

export const updateUserRoleParamsSchema = idParamsSchema

export const updateUserRoleBodySchema = z.object({
  role: z.nativeEnum(UserRole),
})
