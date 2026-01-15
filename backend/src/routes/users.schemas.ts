import { UserRole } from '@prisma/client'
import { z } from 'zod'

export interface CreateUserBody {
  email: string
  password: string
  role: UserRole
}

export interface UpdateUserRoleBody {
  role: UserRole
}

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  createdAt: z.string().optional(),
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
      role: z.nativeEnum(UserRole),
    })
  ),
})

export const createUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
})

export const updateUserRoleParamsSchema = z.object({
  id: z.string().min(1),
})

export const updateUserRoleBodySchema = z.object({
  role: z.nativeEnum(UserRole),
})
