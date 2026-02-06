import { afterEach, describe, expect, it } from 'vitest'
import { prisma, connectOrDisconnect, mapPrismaError } from './prisma'

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

describe('mapPrismaError', () => {
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
