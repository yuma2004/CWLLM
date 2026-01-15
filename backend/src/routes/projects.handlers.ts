import { FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, ProjectStatus } from '@prisma/client'
import { logAuditEntry } from '../services'
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
import { JWTUser } from '../types/auth'
import type {
  ProjectCreateBody,
  ProjectListQuery,
  ProjectSearchQuery,
  ProjectUpdateBody,
} from './projects.schemas'

const normalizeProjectStatus = createEnumNormalizer(new Set(Object.values(ProjectStatus)))

const normalizeSort = (value?: string) => {
  if (!value) return { createdAt: 'desc' as const }
  if (value === 'updatedAt') return { updatedAt: 'desc' as const }
  if (value === 'status') return { status: 'asc' as const }
  if (value === 'name') return { name: 'asc' as const }
  return { createdAt: 'desc' as const }
}

export const listProjectsHandler = async (
  request: FastifyRequest<{ Querystring: ProjectListQuery }>,
  reply: FastifyReply
) => {
  const { q, companyId } = request.query
  const status = normalizeProjectStatus(request.query.status)
  if (request.query.status !== undefined && status === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize
  )

  const where: Prisma.ProjectWhereInput = {}
  if (q && q.trim() !== '') {
    where.name = { contains: q.trim(), mode: 'insensitive' }
  }
  if (companyId) {
    where.companyId = companyId
  }
  if (status) {
    where.status = status
  }

  const orderBy = normalizeSort(request.query.sort)

  const [items, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ])

  return buildPaginatedResponse(items, page, pageSize, total)
}

export const searchProjectsHandler = async (
  request: FastifyRequest<{ Querystring: ProjectSearchQuery }>,
  reply: FastifyReply
) => {
  const rawQuery = request.query.q?.trim() ?? ''
  if (!rawQuery) {
    return reply.code(400).send(badRequest('q is required'))
  }

  const limitValue = Number(request.query.limit)
  const limit = Number.isFinite(limitValue)
    ? Math.min(Math.max(Math.floor(limitValue), 1), 50)
    : 20

  const where: Prisma.ProjectWhereInput = {
    name: { contains: rawQuery, mode: 'insensitive' },
  }
  if (request.query.companyId) {
    where.companyId = request.query.companyId
  }

  const items = await prisma.project.findMany({
    where,
    orderBy: { name: 'asc' },
    take: limit,
    select: {
      id: true,
      name: true,
      companyId: true,
      company: {
        select: { id: true, name: true },
      },
    },
  })

  return { items }
}

export const createProjectHandler = async (
  request: FastifyRequest<{ Body: ProjectCreateBody }>,
  reply: FastifyReply
) => {
  const { companyId, name, conditions, ownerId } = request.body
  const unitPrice = parseNumber(request.body.unitPrice)
  const periodStart = parseDate(request.body.periodStart)
  const periodEnd = parseDate(request.body.periodEnd)
  const normalizedStatus = normalizeProjectStatus(request.body.status)

  if (!isNonEmptyString(companyId)) {
    return reply.code(400).send(badRequest('companyId is required'))
  }
  if (!isNonEmptyString(name)) {
    return reply.code(400).send(badRequest('name is required'))
  }
  if (unitPrice === null) {
    return reply.code(400).send(badRequest('Invalid unitPrice'))
  }
  if (request.body.periodStart && !periodStart) {
    return reply.code(400).send(badRequest('Invalid periodStart'))
  }
  if (request.body.periodEnd && !periodEnd) {
    return reply.code(400).send(badRequest('Invalid periodEnd'))
  }
  if (ownerId !== undefined && !isNonEmptyString(ownerId)) {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }
  if (request.body.status !== undefined && normalizedStatus === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) {
    return reply.code(404).send(notFound('Company'))
  }

  try {
    const project = await prisma.project.create({
      data: {
        companyId,
        name: name.trim(),
        conditions,
        unitPrice: unitPrice ?? undefined,
        periodStart: periodStart ?? undefined,
        periodEnd: periodEnd ?? undefined,
        status: normalizedStatus ?? undefined,
        ownerId,
      },
    })

    const userId = (request.user as JWTUser | undefined)?.userId
    await logAuditEntry({
      entityType: 'Project',
      entityId: project.id,
      action: 'create',
      userId,
      after: project,
    })

    return reply.code(201).send({ project })
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const getProjectHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const project = await prisma.project.findUnique({
    where: { id: request.params.id },
    include: {
      company: { select: { id: true, name: true } },
    },
  })
  if (!project) {
    return reply.code(404).send(notFound('Project'))
  }
  return { project }
}

export const updateProjectHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: ProjectUpdateBody }>,
  reply: FastifyReply
) => {
  const { name, conditions, ownerId } = request.body
  const unitPrice = parseNumber(request.body.unitPrice)
  const periodStart = parseDate(request.body.periodStart)
  const periodEnd = parseDate(request.body.periodEnd)
  const normalizedStatus = normalizeProjectStatus(request.body.status)

  if (name !== undefined && !isNonEmptyString(name)) {
    return reply.code(400).send(badRequest('name is required'))
  }
  if (!isNullableString(conditions)) {
    return reply.code(400).send(badRequest('Invalid conditions'))
  }
  if (unitPrice === null) {
    return reply.code(400).send(badRequest('Invalid unitPrice'))
  }
  if (request.body.periodStart !== undefined && request.body.periodStart !== null && !periodStart) {
    return reply.code(400).send(badRequest('Invalid periodStart'))
  }
  if (request.body.periodEnd !== undefined && request.body.periodEnd !== null && !periodEnd) {
    return reply.code(400).send(badRequest('Invalid periodEnd'))
  }
  if (request.body.status !== undefined && normalizedStatus === null) {
    return reply.code(400).send(badRequest('Invalid status'))
  }
  if (!isNullableString(ownerId)) {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }
  if (typeof ownerId === 'string' && ownerId.trim() === '') {
    return reply.code(400).send(badRequest('Invalid ownerId'))
  }

  const existing = await prisma.project.findUnique({ where: { id: request.params.id } })
  if (!existing) {
    return reply.code(404).send(notFound('Project'))
  }

  const data: Prisma.ProjectUpdateInput = {}
  if (name !== undefined) {
    data.name = name.trim()
  }
  if (conditions !== undefined) {
    data.conditions = conditions
  }
  if (unitPrice !== undefined) {
    data.unitPrice = unitPrice
  }
  if (request.body.periodStart !== undefined) {
    data.periodStart = periodStart ?? null
  }
  if (request.body.periodEnd !== undefined) {
    data.periodEnd = periodEnd ?? null
  }
  if (normalizedStatus !== undefined && normalizedStatus !== null) {
    data.status = normalizedStatus
  }
  if (ownerId !== undefined) {
    data.owner = connectOrDisconnect(ownerId)
  }

  try {
    const project = await prisma.project.update({
      where: { id: request.params.id },
      data,
    })

    const userId = (request.user as JWTUser | undefined)?.userId
    await logAuditEntry({
      entityType: 'Project',
      entityId: project.id,
      action: 'update',
      userId,
      before: existing,
      after: project,
    })

    return { project }
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const deleteProjectHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const existing = await prisma.project.findUnique({ where: { id: request.params.id } })
  if (!existing) {
    return reply.code(404).send(notFound('Project'))
  }

  try {
    await prisma.project.delete({ where: { id: request.params.id } })

    const userId = (request.user as JWTUser | undefined)?.userId
    await logAuditEntry({
      entityType: 'Project',
      entityId: existing.id,
      action: 'delete',
      userId,
      before: existing,
    })

    return reply.code(204).send()
  } catch (error) {
    return handlePrismaError(reply, error)
  }
}

export const listProjectWholesalesHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const project = await prisma.project.findUnique({ where: { id: request.params.id } })
  if (!project) {
    return reply.code(404).send(notFound('Project'))
  }

  const wholesales = await prisma.wholesale.findMany({
    where: { projectId: request.params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, email: true } },
    },
  })

  return { wholesales }
}

export const listCompanyProjectsHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const company = await prisma.company.findUnique({ where: { id: request.params.id } })
  if (!company) {
    return reply.code(404).send(notFound('Company'))
  }

  const projects = await prisma.project.findMany({
    where: { companyId: request.params.id },
    orderBy: { createdAt: 'desc' },
  })

  return { projects }
}
