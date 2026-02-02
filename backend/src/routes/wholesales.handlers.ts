import { FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, WholesaleStatus } from '@prisma/client'
import {
  badRequest,
  buildPaginatedResponse,
  connectOrDisconnect,
  createEnumNormalizer,
  handlePrismaError,
  isNonEmptyString,
  isNullableString,
  notFound,
  parseDate,
  parseNumber,
  parsePagination,
  prisma,
} from '../utils'
import type {
  WholesaleCreateBody,
  WholesaleListQuery,
  WholesaleUpdateBody,
} from './wholesales.schemas'

const normalizeStatus = createEnumNormalizer(new Set(Object.values(WholesaleStatus)))

export const listWholesalesHandler = async (
  request: FastifyRequest<{ Querystring: WholesaleListQuery }>,
  reply: FastifyReply
) => {
  const { projectId, companyId } = request.query
  const status = normalizeStatus(request.query.status)
  if (request.query.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize
  )

  const where: Prisma.WholesaleWhereInput = {}
  if (projectId) {
    where.projectId = projectId
  }
  if (companyId) {
    where.companyId = companyId
  }
  if (status) {
    where.status = status
  }

  const [items, total] = await prisma.$transaction([
    prisma.wholesale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        project: {
          select: { id: true, name: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.wholesale.count({ where }),
  ])

  return buildPaginatedResponse(items, page, pageSize, total)
}

export const createWholesaleHandler = async (
  request: FastifyRequest<{ Body: WholesaleCreateBody }>,
  reply: FastifyReply
) => {
  const { projectId, companyId, conditions, ownerId } = request.body
  const unitPriceInput = request.body.unitPrice
  const marginInput = request.body.margin
  const unitPrice = parseNumber(unitPriceInput)
  const margin = parseNumber(marginInput)
  const agreedDate = parseDate(request.body.agreedDate)
  const status = normalizeStatus(request.body.status)

  if (!isNonEmptyString(projectId)) {
    return reply.code(400).send(badRequest('projectId is required'))
  }
  if (!isNonEmptyString(companyId)) {
    return reply.code(400).send(badRequest('companyId is required'))
  }
  if (unitPrice === null && unitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid unitPrice'))
  }
  if (margin === null && marginInput !== null) {
    return reply.code(400).send(badRequest('Invalid margin'))
  }
  if (request.body.agreedDate && !agreedDate) {
    return reply.code(400).send(badRequest('Invalid agreedDate'))
  }
  if (request.body.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  if (ownerId !== undefined && !isNonEmptyString(ownerId)) {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }

  const normalizedUnitPrice = unitPriceInput === null ? undefined : unitPrice
  const normalizedMargin = marginInput === null ? undefined : margin

  const [project, company] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ])
  if (!project) {
    return reply.code(404).send(notFound('Project'))
  }
  if (!company) {
    return reply.code(404).send(notFound('Company'))
  }

  try {
    const wholesale = await prisma.wholesale.create({
      data: {
        projectId,
        companyId,
        conditions,
        unitPrice: normalizedUnitPrice ?? undefined,
        margin: normalizedMargin ?? undefined,
        status: status ?? undefined,
        agreedDate: agreedDate ?? undefined,
        ownerId,
      },
    })

    return reply.code(201).send({ wholesale })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const getWholesaleHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const wholesale = await prisma.wholesale.findUnique({
    where: { id: request.params.id },
    include: {
      project: {
        select: { id: true, name: true },
      },
      company: {
        select: { id: true, name: true },
      },
    },
  })
  if (!wholesale) {
    return reply.code(404).send(notFound('Wholesale'))
  }
  return { wholesale }
}

export const updateWholesaleHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: WholesaleUpdateBody }>,
  reply: FastifyReply
) => {
  const { projectId, companyId, conditions, ownerId } = request.body
  const unitPriceInput = request.body.unitPrice
  const marginInput = request.body.margin
  const unitPrice = parseNumber(unitPriceInput)
  const margin = parseNumber(marginInput)
  const agreedDate = parseDate(request.body.agreedDate)
  const status = normalizeStatus(request.body.status)

  if (projectId !== undefined && !isNonEmptyString(projectId)) {
    return reply.code(400).send(badRequest('Invalid projectId'))
  }
  if (companyId !== undefined && !isNonEmptyString(companyId)) {
    return reply.code(400).send(badRequest('Invalid companyId'))
  }
  if (!isNullableString(conditions)) {
    return reply.code(400).send(badRequest('Invalid conditions'))
  }
  if (unitPrice === null && unitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid unitPrice'))
  }
  if (margin === null && marginInput !== null) {
    return reply.code(400).send(badRequest('Invalid margin'))
  }
  if (request.body.agreedDate !== undefined && request.body.agreedDate !== null && !agreedDate) {
    return reply.code(400).send(badRequest('Invalid agreedDate'))
  }
  if (request.body.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  if (!isNullableString(ownerId)) {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }
  if (typeof ownerId === 'string' && ownerId.trim() === '') {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }

  const existing = await prisma.wholesale.findUnique({ where: { id: request.params.id } })
  if (!existing) {
    return reply.code(404).send(notFound('Wholesale'))
  }

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return reply.code(404).send(notFound('Project'))
    }
  }
  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return reply.code(404).send(notFound('Company'))
    }
  }

  const data: Prisma.WholesaleUpdateInput = {}
  if (projectId !== undefined) {
    data.project = { connect: { id: projectId } }
  }
  if (companyId !== undefined) {
    data.company = { connect: { id: companyId } }
  }
  if (conditions !== undefined) {
    data.conditions = conditions
  }
  if (unitPriceInput === null) {
    data.unitPrice = null
  } else if (unitPrice !== undefined) {
    data.unitPrice = unitPrice
  }
  if (marginInput === null) {
    data.margin = null
  } else if (margin !== undefined) {
    data.margin = margin
  }
  if (request.body.agreedDate !== undefined) {
    data.agreedDate = agreedDate ?? null
  }
  if (status !== undefined && status !== null) {
    data.status = status
  }
  if (ownerId !== undefined) {
    data.owner = connectOrDisconnect(ownerId)
  }

  try {
    const wholesale = await prisma.wholesale.update({
      where: { id: request.params.id },
      data,
    })

    return { wholesale }
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const deleteWholesaleHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const existing = await prisma.wholesale.findUnique({ where: { id: request.params.id } })
  if (!existing) {
    return reply.code(404).send(notFound('Wholesale'))
  }

  try {
    await prisma.wholesale.delete({ where: { id: request.params.id } })

    return reply.code(204).send()
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const listCompanyWholesalesHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const company = await prisma.company.findUnique({ where: { id: request.params.id } })
  if (!company) {
    return reply.code(404).send(notFound('Company'))
  }

  const wholesales = await prisma.wholesale.findMany({
    where: { companyId: request.params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  })

  return { wholesales }
}
