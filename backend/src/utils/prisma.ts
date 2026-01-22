import { Prisma, PrismaClient } from '@prisma/client'
import { FastifyReply } from 'fastify'
import { buildErrorPayload } from './errors'

export type PrismaErrorMap = Partial<Record<string, { status: number; message: string }>>

export const DEFAULT_PRISMA_ERROR_MAP: PrismaErrorMap = {
  P2003: { status: 400, message: 'Invalid relation' },
  P2025: { status: 404, message: 'Not found' },
}

export const GLOBAL_PRISMA_ERROR_MAP: PrismaErrorMap = {
  ...DEFAULT_PRISMA_ERROR_MAP,
  P2002: { status: 409, message: 'Conflict' },
}

export const prisma = new PrismaClient()

export const mapPrismaError = (
  error: unknown,
  overrides: PrismaErrorMap = {},
  baseMap: PrismaErrorMap = DEFAULT_PRISMA_ERROR_MAP
) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null
  const errorMap = { ...baseMap, ...overrides }
  const mapped = errorMap[error.code]
  if (!mapped) return null
  return { statusCode: mapped.status, message: mapped.message }
}

export const handlePrismaError = (
  reply: FastifyReply,
  error: unknown,
  overrides: PrismaErrorMap = {}
) => {
  const mapped = mapPrismaError(error, overrides)
  if (mapped) {
    return reply
      .code(mapped.statusCode)
      .send(buildErrorPayload(mapped.statusCode, mapped.message))
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
