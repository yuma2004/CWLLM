import { Prisma, PrismaClient } from '@prisma/client'
import { FastifyReply } from 'fastify'
import { buildErrorPayload } from './errors'

export type PrismaErrorMap = Partial<
  Record<string, { status: number; message: string }>
>

const DEFAULT_PRISMA_ERROR_MAP: PrismaErrorMap = {
  P2003: { status: 400, message: 'Invalid relation' },
  P2025: { status: 404, message: 'Not found' },
}

export const prisma = new PrismaClient()

export const handlePrismaError = (
  reply: FastifyReply,
  error: unknown,
  overrides: PrismaErrorMap = {}
) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const errorMap = { ...DEFAULT_PRISMA_ERROR_MAP, ...overrides }
    const mapped = errorMap[error.code]
    if (mapped) {
      return reply.code(mapped.status).send(buildErrorPayload(mapped.status, mapped.message))
    }
  }
  return reply.code(500).send(buildErrorPayload(500, 'Internal server error'))
}

/**
 * Helper for Prisma relation connect/disconnect operations.
 * Returns connect if id is provided, disconnect if null, undefined if undefined.
 */
export const connectOrDisconnect = <T extends string | null | undefined>(
  id: T
): { connect: { id: string } } | { disconnect: true } | undefined => {
  if (id === undefined) return undefined
  if (id === null) return { disconnect: true }
  return { connect: { id } }
}
