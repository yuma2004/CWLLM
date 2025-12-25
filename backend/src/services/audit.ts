import { PrismaClient } from '@prisma/client'

export interface AuditPayload {
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  userId?: string | null
  before?: unknown
  after?: unknown
}

export const logAudit = async (prisma: PrismaClient, payload: AuditPayload) => {
  const changes = JSON.stringify({
    before: payload.before ?? null,
    after: payload.after ?? null,
  })

  await prisma.auditLog.create({
    data: {
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      userId: payload.userId ?? null,
      changes,
    },
  })
}
