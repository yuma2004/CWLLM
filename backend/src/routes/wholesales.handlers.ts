import { FastifyReply, FastifyRequest } from 'fastify'
import { DealStatus, Prisma, WholesaleStatus } from '@prisma/client'
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
import { canTransitionDealStatus } from '../services/deals/dealStatus'
import type {
  WholesaleCreateBody,
  WholesaleListQuery,
  WholesaleNegotiationCreateBody,
  WholesaleUpdateBody,
} from './wholesales.schemas'

const normalizeStatus = createEnumNormalizer(new Set(Object.values(WholesaleStatus)))
const normalizeDealStatus = createEnumNormalizer(new Set(Object.values(DealStatus)))

const parseQueryNumber = (value?: string): number | null | undefined => {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return null
  return parsed
}

export const listWholesalesHandler = async (
  request: FastifyRequest<{ Querystring: WholesaleListQuery }>,
  reply: FastifyReply
) => {
  const { projectId, companyId, ownerId } = request.query
  const status = normalizeStatus(request.query.status)
  const dealStatus = normalizeDealStatus(request.query.dealStatus)
  const unitPriceMin = parseQueryNumber(request.query.unitPriceMin)
  const unitPriceMax = parseQueryNumber(request.query.unitPriceMax)
  if (request.query.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  if (request.query.dealStatus !== undefined && dealStatus === null) {
    return reply.code(400).send(badRequest('Invalid dealStatus'))
  }
  if (ownerId !== undefined && !isNonEmptyString(ownerId)) {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }
  if (unitPriceMin === null) {
    return reply.code(400).send(badRequest('Invalid unitPriceMin'))
  }
  if (unitPriceMax === null) {
    return reply.code(400).send(badRequest('Invalid unitPriceMax'))
  }
  if (
    unitPriceMin !== undefined &&
    unitPriceMax !== undefined &&
    unitPriceMin > unitPriceMax
  ) {
    return reply.code(400).send(badRequest('unitPriceMin must be less than or equal to unitPriceMax'))
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
  if (dealStatus) {
    where.dealStatus = dealStatus
  }
  if (ownerId) {
    where.ownerId = ownerId
  }
  if (unitPriceMin !== undefined || unitPriceMax !== undefined) {
    where.unitPrice = {
      ...(unitPriceMin !== undefined ? { gte: unitPriceMin } : {}),
      ...(unitPriceMax !== undefined ? { lte: unitPriceMax } : {}),
    }
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
        owner: {
          select: { id: true, email: true, name: true },
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
  const { projectId, companyId, conditions, ownerId, specialConditions } = request.body
  const unitPriceInput = request.body.unitPrice
  const marginInput = request.body.margin
  const proposedUnitPriceInput = request.body.proposedUnitPrice
  const agreedUnitPriceInput = request.body.agreedUnitPrice
  const unitPrice = parseNumber(unitPriceInput)
  const margin = parseNumber(marginInput)
  const proposedUnitPrice = parseNumber(proposedUnitPriceInput)
  const agreedUnitPrice = parseNumber(agreedUnitPriceInput)
  const agreedDate = parseDate(request.body.agreedDate)
  const nextActionAt = parseDate(request.body.nextActionAt)
  const status = normalizeStatus(request.body.status)
  const dealStatus = normalizeDealStatus(request.body.dealStatus)

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
  if (proposedUnitPrice === null && proposedUnitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid proposedUnitPrice'))
  }
  if (agreedUnitPrice === null && agreedUnitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid agreedUnitPrice'))
  }
  if (request.body.agreedDate && !agreedDate) {
    return reply.code(400).send(badRequest('Invalid agreedDate'))
  }
  if (request.body.nextActionAt && !nextActionAt) {
    return reply.code(400).send(badRequest('Invalid nextActionAt'))
  }
  if (request.body.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  if (request.body.dealStatus !== undefined && dealStatus === null) {
    return reply.code(400).send(badRequest('Invalid dealStatus'))
  }
  if (ownerId !== undefined && !isNonEmptyString(ownerId)) {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }
  if (specialConditions !== undefined && !isNonEmptyString(specialConditions)) {
    return reply.code(400).send(badRequest('Invalid specialConditions'))
  }

  const normalizedUnitPrice = unitPriceInput === null ? undefined : unitPrice
  const normalizedMargin = marginInput === null ? undefined : margin
  const normalizedProposedUnitPrice =
    proposedUnitPriceInput === null ? undefined : proposedUnitPrice
  const normalizedAgreedUnitPrice = agreedUnitPriceInput === null ? undefined : agreedUnitPrice

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
        dealStatus: dealStatus ?? undefined,
        proposedUnitPrice: normalizedProposedUnitPrice ?? undefined,
        agreedUnitPrice: normalizedAgreedUnitPrice ?? undefined,
        nextActionAt: nextActionAt ?? undefined,
        specialConditions,
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
  const { projectId, companyId, conditions, ownerId, specialConditions } = request.body
  const unitPriceInput = request.body.unitPrice
  const marginInput = request.body.margin
  const proposedUnitPriceInput = request.body.proposedUnitPrice
  const agreedUnitPriceInput = request.body.agreedUnitPrice
  const unitPrice = parseNumber(unitPriceInput)
  const margin = parseNumber(marginInput)
  const proposedUnitPrice = parseNumber(proposedUnitPriceInput)
  const agreedUnitPrice = parseNumber(agreedUnitPriceInput)
  const agreedDate = parseDate(request.body.agreedDate)
  const nextActionAt = parseDate(request.body.nextActionAt)
  const status = normalizeStatus(request.body.status)
  const dealStatus = normalizeDealStatus(request.body.dealStatus)

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
  if (proposedUnitPrice === null && proposedUnitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid proposedUnitPrice'))
  }
  if (agreedUnitPrice === null && agreedUnitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid agreedUnitPrice'))
  }
  if (request.body.agreedDate !== undefined && request.body.agreedDate !== null && !agreedDate) {
    return reply.code(400).send(badRequest('Invalid agreedDate'))
  }
  if (request.body.nextActionAt !== undefined && request.body.nextActionAt !== null && !nextActionAt) {
    return reply.code(400).send(badRequest('Invalid nextActionAt'))
  }
  if (request.body.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  if (request.body.dealStatus !== undefined && dealStatus === null) {
    return reply.code(400).send(badRequest('Invalid dealStatus'))
  }
  if (!isNullableString(ownerId)) {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }
  if (!isNullableString(specialConditions)) {
    return reply.code(400).send(badRequest('Invalid specialConditions'))
  }
  if (typeof ownerId === 'string' && ownerId.trim() === '') {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }
  if (typeof specialConditions === 'string' && specialConditions.trim() === '') {
    return reply.code(400).send(badRequest('Invalid specialConditions'))
  }

  const existing = await prisma.wholesale.findUnique({ where: { id: request.params.id } })
  if (!existing) {
    return reply.code(404).send(notFound('Wholesale'))
  }
  if (
    dealStatus !== undefined &&
    dealStatus !== null &&
    !canTransitionDealStatus(existing.dealStatus, dealStatus)
  ) {
    return reply.code(400).send(badRequest('Invalid dealStatus transition'))
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
  if (proposedUnitPriceInput === null) {
    data.proposedUnitPrice = null
  } else if (proposedUnitPrice !== undefined) {
    data.proposedUnitPrice = proposedUnitPrice
  }
  if (agreedUnitPriceInput === null) {
    data.agreedUnitPrice = null
  } else if (agreedUnitPrice !== undefined) {
    data.agreedUnitPrice = agreedUnitPrice
  }
  if (request.body.agreedDate !== undefined) {
    data.agreedDate = agreedDate ?? null
  }
  if (request.body.nextActionAt !== undefined) {
    data.nextActionAt = nextActionAt ?? null
  }
  if (status !== undefined && status !== null) {
    data.status = status
  }
  if (dealStatus !== undefined && dealStatus !== null) {
    data.dealStatus = dealStatus
  }
  if (ownerId !== undefined) {
    data.owner = connectOrDisconnect(ownerId)
  }
  if (specialConditions !== undefined) {
    data.specialConditions = specialConditions
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

export const listWholesaleNegotiationsHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const wholesale = await prisma.wholesale.findUnique({ where: { id: request.params.id } })
  if (!wholesale) {
    return reply.code(404).send(notFound('Wholesale'))
  }

  const negotiations = await prisma.dealNegotiation.findMany({
    where: { wholesaleId: request.params.id },
    orderBy: [{ actionAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      actor: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  return { negotiations }
}

export const createWholesaleNegotiationHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: WholesaleNegotiationCreateBody }>,
  reply: FastifyReply
) => {
  const { actorId, note } = request.body
  const offeredUnitPriceInput = request.body.offeredUnitPrice
  const agreedUnitPriceInput = request.body.agreedUnitPrice
  const offeredUnitPrice = parseNumber(offeredUnitPriceInput)
  const agreedUnitPrice = parseNumber(agreedUnitPriceInput)
  const actionAt = parseDate(request.body.actionAt) ?? new Date()

  if (offeredUnitPrice === null && offeredUnitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid offeredUnitPrice'))
  }
  if (agreedUnitPrice === null && agreedUnitPriceInput !== null) {
    return reply.code(400).send(badRequest('Invalid agreedUnitPrice'))
  }
  if (request.body.actionAt !== undefined && request.body.actionAt !== null && !parseDate(request.body.actionAt)) {
    return reply.code(400).send(badRequest('Invalid actionAt'))
  }
  if (actorId !== undefined && !isNonEmptyString(actorId)) {
    return reply.code(400).send(badRequest('Invalid actorId'))
  }
  if (note !== undefined && !isNonEmptyString(note)) {
    return reply.code(400).send(badRequest('Invalid note'))
  }
  if (
    offeredUnitPrice === undefined &&
    agreedUnitPrice === undefined &&
    note === undefined
  ) {
    return reply.code(400).send(badRequest('At least one negotiation field is required'))
  }

  const wholesale = await prisma.wholesale.findUnique({ where: { id: request.params.id } })
  if (!wholesale) {
    return reply.code(404).send(notFound('Wholesale'))
  }
  if (actorId) {
    const actor = await prisma.user.findUnique({ where: { id: actorId } })
    if (!actor) {
      return reply.code(404).send(notFound('User'))
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const negotiation = await tx.dealNegotiation.create({
        data: {
          wholesaleId: request.params.id,
          actorId,
          offeredUnitPrice: offeredUnitPrice ?? undefined,
          agreedUnitPrice: agreedUnitPrice ?? undefined,
          note,
          actionAt,
        },
      })

      const wholesaleUpdateData: Prisma.WholesaleUpdateInput = {}
      if (offeredUnitPrice !== undefined) {
        wholesaleUpdateData.proposedUnitPrice = offeredUnitPrice
      }
      if (agreedUnitPrice !== undefined) {
        wholesaleUpdateData.agreedUnitPrice = agreedUnitPrice
      }
      if (Object.keys(wholesaleUpdateData).length > 0) {
        await tx.wholesale.update({
          where: { id: request.params.id },
          data: wholesaleUpdateData,
        })
      }

      return negotiation
    })

    return reply.code(201).send({ negotiation: result })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}
