import { z } from 'zod'

export interface LoginBody {
  email: string
  password: string
}

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
