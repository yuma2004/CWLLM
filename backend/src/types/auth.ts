import { UserRole } from '@prisma/client'

export interface JWTUser {
  userId: string
  role: UserRole
}
