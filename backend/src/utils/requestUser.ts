import { FastifyReply, FastifyRequest } from 'fastify'
import type { JWTUser } from '../types/auth'
import { unauthorized } from './errors'

export const getRequestUser = (
  request: FastifyRequest
): JWTUser | null => {
  const { user } = request
  if (!user?.userId || !user.role) return null
  return { userId: user.userId, role: user.role as JWTUser['role'] }
}

export const requireRequestUser = (
  request: FastifyRequest,
  reply: FastifyReply
): JWTUser | null => {
  const user = getRequestUser(request)
  if (!user) {
    void reply.code(401).send(unauthorized())
    return null
  }
  return user
}
