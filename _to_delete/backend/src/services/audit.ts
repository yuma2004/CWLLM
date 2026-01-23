import { PrismaClient } from '@prisma/client'
import { prisma } from '../utils'

export interface AuditPayload {
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  userId?: string | null
  before?: unknown
  after?: unknown
}

export const logAudit = async (prisma: PrismaClient, payload: AuditPayload) => {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: payload.entityType,
        entityId: payload.entityId,
        action: payload.action,
        userId: payload.userId ?? null,
        changes: {
          before: payload.before ?? null,
          after: payload.after ?? null,
        },
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Failed to write audit log', error)
      return
    }
    throw error
  }
}

export const logAuditEntry = async (payload: AuditPayload) => logAudit(prisma, payload)
