import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import {
  connectOrDisconnect,
  handlePrismaError,
  mapPrismaError,
  prisma,
} from './prisma'

const companyPrefix = `prisma-util-company-${Date.now()}`
const projectPrefix = `prisma-util-project-${Date.now()}`

const captureError = async (operation: () => Promise<unknown>) => {
  try {
    await operation()
  } catch (error) {
    return error
  }
  return null
}

afterEach(async () => {
  await prisma.project.deleteMany({
    where: {
      name: {
        startsWith: projectPrefix,
      },
    },
  })
  await prisma.company.deleteMany({
    where: {
      normalizedName: {
        startsWith: companyPrefix,
      },
    },
  })
})

describe('mapPrismaError', () => {
  it('returns null for non prisma errors', () => {
    expect(mapPrismaError(new Error('x'))).toBeNull()
  })

  it('maps unique constraint violations (P2002) and supports overrides', async () => {
    const normalizedName = `${companyPrefix}-dup`
    await prisma.company.create({
      data: {
        name: 'Prisma Util Company',
        normalizedName,
        status: 'active',
        tags: [],
      },
    })

    const error = await captureError(() =>
      prisma.company.create({
        data: {
          name: 'Prisma Util Company 2',
          normalizedName,
          status: 'active',
          tags: [],
        },
      })
    )

    expect(error).not.toBeNull()
    expect(mapPrismaError(error)).toEqual({
      statusCode: 409,
      message: 'Conflict',
    })
    expect(
      mapPrismaError(error, {
        P2002: { status: 422, message: 'Duplicate' },
      })
    ).toEqual({
      statusCode: 422,
      message: 'Duplicate',
    })
  })

  it('maps relation and not-found errors', async () => {
    const relationError = await captureError(() =>
      prisma.project.create({
        data: {
          companyId: 'missing-company-id',
          name: `${projectPrefix}-relation`,
          status: 'active',
        },
      })
    )
    expect(mapPrismaError(relationError)).toEqual({
      statusCode: 400,
      message: 'Invalid relation',
    })

    const notFoundError = await captureError(() =>
      prisma.company.update({
        where: { id: 'missing-company-id' },
        data: { name: 'x' },
      })
    )
    expect(mapPrismaError(notFoundError)).toEqual({
      statusCode: 404,
      message: 'Not found',
    })
  })
})

describe('connectOrDisconnect', () => {
  it('returns connect payload when id is provided', () => {
    expect(connectOrDisconnect('u1')).toEqual({ connect: { id: 'u1' } })
  })

  it('returns disconnect payload when id is null', () => {
    expect(connectOrDisconnect(null)).toEqual({ disconnect: true })
  })

  it('returns undefined when id is undefined', () => {
    expect(connectOrDisconnect(undefined)).toBeUndefined()
  })
})

describe('handlePrismaError', () => {
  it('returns mapped status and payload when prisma error is known', async () => {
    const normalizedName = `${companyPrefix}-handle`
    await prisma.company.create({
      data: {
        name: 'Prisma Handle Company',
        normalizedName,
        status: 'active',
        tags: [],
      },
    })
    const error = await captureError(() =>
      prisma.company.create({
        data: {
          name: 'Prisma Handle Company 2',
          normalizedName,
          status: 'active',
          tags: [],
        },
      })
    )
    expect(error).not.toBeNull()

    const app = Fastify()
    app.get('/known', async (_request, reply) => handlePrismaError(reply, error))

    const response = await app.inject({
      method: 'GET',
      url: '/known',
    })
    await app.close()

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'Conflict',
      },
    })
  })

  it('returns 500 payload for unmapped errors', async () => {
    const app = Fastify()
    app.get('/unknown', async (_request, reply) =>
      handlePrismaError(reply, new Error('boom'))
    )

    const response = await app.inject({
      method: 'GET',
      url: '/unknown',
    })
    await app.close()

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    })
  })
})
