import { FastifyInstance } from 'fastify'
import { Prisma, ProjectStatus } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'
import { parsePagination } from '../utils/pagination'
import { connectOrDisconnect, handlePrismaError, prisma } from '../utils/prisma'
import {
  createEnumNormalizer,
  isNonEmptyString,
  isNullableString,
  parseDate,
  parseNumber,
} from '../utils/validation'
import { JWTUser } from '../types/auth'
import { badRequest, notFound } from '../utils/errors'

const normalizeProjectStatus = createEnumNormalizer(new Set(Object.values(ProjectStatus)))

const normalizeSort = (value?: string) => {
  if (!value) return { createdAt: 'desc' as const }
  if (value === 'updatedAt') return { updatedAt: 'desc' as const }
  if (value === 'status') return { status: 'asc' as const }
  if (value === 'name') return { name: 'asc' as const }
  return { createdAt: 'desc' as const }
}

interface ProjectCreateBody {
  companyId: string
  name: string
  conditions?: string
  unitPrice?: number
  periodStart?: string
  periodEnd?: string
  status?: ProjectStatus
  ownerId?: string
}

interface ProjectUpdateBody {
  name?: string
  conditions?: string | null
  unitPrice?: number | null
  periodStart?: string | null
  periodEnd?: string | null
  status?: ProjectStatus
  ownerId?: string | null
}

interface ProjectListQuery {
  q?: string
  companyId?: string
  status?: string
  sort?: string
  page?: string
  pageSize?: string
}

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: ProjectListQuery }>(
    '/projects',
    { preHandler: requireAuth() },
    async (request, reply) => {
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

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      }
    }
  )

  fastify.post<{ Body: ProjectCreateBody }>(
    '/projects',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
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
        await logAudit(prisma, {
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
  )

  fastify.get<{ Params: { id: string } }>(
    '/projects/:id',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const project = await prisma.project.findUnique({ where: { id: request.params.id } })
      if (!project) {
        return reply.code(404).send(notFound('Project'))
      }
      return { project }
    }
  )

  fastify.patch<{ Params: { id: string }; Body: ProjectUpdateBody }>(
    '/projects/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
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
      if (normalizedStatus !== undefined) {
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
        await logAudit(prisma, {
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
  )

  fastify.delete<{ Params: { id: string } }>(
    '/projects/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const existing = await prisma.project.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send(notFound('Project'))
      }

      try {
        await prisma.project.delete({ where: { id: request.params.id } })

        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
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
  )

  fastify.get<{ Params: { id: string } }>(
    '/projects/:id/wholesales',
    { preHandler: requireAuth() },
    async (request, reply) => {
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
  )

  fastify.get<{ Params: { id: string } }>(
    '/companies/:id/projects',
    { preHandler: requireAuth() },
    async (request, reply) => {
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
  )
}
