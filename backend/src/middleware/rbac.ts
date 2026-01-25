import { FastifyRequest, FastifyReply } from 'fastify'
import { JWTUser } from '../types/auth'

type Role = 'admin' | 'employee'

const ALLOWED_ROLES: Role[] = ['admin', 'employee']

export function requireAuth(
  allowedRoles?: Role[]
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Fastifyの標準的なJWT検証を使用（CookieとAuthorizationヘッダーの両方に対応）
      await request.jwtVerify()
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const user = request.user as JWTUser | undefined
    if (!user?.userId || !user.role || !ALLOWED_ROLES.includes(user.role as Role)) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role as Role)) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
    }
  }
}

export function requireAdmin() {
  return requireAuth(['admin'])
}

export function requireWriteAccess() {
  return requireAuth(['admin', 'employee'])
}
