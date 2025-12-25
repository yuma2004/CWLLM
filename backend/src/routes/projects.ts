import { FastifyInstance, FastifyReply } from 'fastify'
import { Prisma, PrismaClient } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'

const prisma = new PrismaClient()

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isNullableString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === 'string'

const parseDate = (value?: string | null) => {
  if (!value) return value === null ? null : undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const parseNumber = (value: unknown) => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

const parsePagination = (pageValue?: string, pageSizeValue?: string) => {
  const page = Math.max(Number(pageValue) || 1, 1)
  const pageSize = Math.min(Math.max(Number(pageSizeValue) || 20, 1), 100)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

const handlePrismaError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2003') {
      return reply.code(400).send({ error: 'Invalid relation' })
    }
    if (error.code === 'P2025') {
      return reply.code(404).send({ error: 'Not found' })
    }
  }
  return reply.code(500).send({ error: 'Internal server error' })
}

interface JWTUser {
  userId: string
  role: string
}

interface ProjectCreateBody {
  companyId: string
  name: string
  conditions?: string
  unitPrice?: number
  periodStart?: string
  periodEnd?: string
  status?: string
  ownerId?: string
}

interface ProjectUpdateBody {
  name?: string
  conditions?: string | null
  unitPrice?: number | null
  periodStart?: string | null
  periodEnd?: string | null
  status?: string
  ownerId?: string | null
}

interface ProjectListQuery {
  q?: string
  companyId?: string
  status?: string
  page?: string
  pageSize?: string
}

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: ProjectListQuery }>(
    '/projects',
    { preHandler: requireAuth() },
    async (request) => {
      const { q, companyId, status } = request.query
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

      const [items, total] = await prisma.$transaction([
        prisma.project.findMany({
          where,
          orderBy: { createdAt: 'desc' },
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
      const { companyId, name, conditions, status, ownerId } = request.body
      const unitPrice = parseNumber(request.body.unitPrice)
      const periodStart = parseDate(request.body.periodStart)
      const periodEnd = parseDate(request.body.periodEnd)

      if (!isNonEmptyString(companyId)) {
        return reply.code(400).send({ error: 'companyId is required' })
      }
      if (!isNonEmptyString(name)) {
        return reply.code(400).send({ error: 'name is required' })
      }
      if (unitPrice === null) {
        return reply.code(400).send({ error: 'Invalid unitPrice' })
      }
      if (request.body.periodStart && !periodStart) {
        return reply.code(400).send({ error: 'Invalid periodStart' })
      }
      if (request.body.periodEnd && !periodEnd) {
        return reply.code(400).send({ error: 'Invalid periodEnd' })
      }
      if (ownerId !== undefined && !isNonEmptyString(ownerId)) {
        return reply.code(400).send({ error: 'Invalid ownerId' })
      }

      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
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
            status,
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
        return reply.code(404).send({ error: 'Project not found' })
      }
      return { project }
    }
  )

  fastify.patch<{ Params: { id: string }; Body: ProjectUpdateBody }>(
    '/projects/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { name, conditions, status, ownerId } = request.body
      const unitPrice = parseNumber(request.body.unitPrice)
      const periodStart = parseDate(request.body.periodStart)
      const periodEnd = parseDate(request.body.periodEnd)

      if (name !== undefined && !isNonEmptyString(name)) {
        return reply.code(400).send({ error: 'name is required' })
      }
      if (!isNullableString(conditions)) {
        return reply.code(400).send({ error: 'Invalid conditions' })
      }
      if (unitPrice === null) {
        return reply.code(400).send({ error: 'Invalid unitPrice' })
      }
      if (request.body.periodStart !== undefined && request.body.periodStart !== null && !periodStart) {
        return reply.code(400).send({ error: 'Invalid periodStart' })
      }
      if (request.body.periodEnd !== undefined && request.body.periodEnd !== null && !periodEnd) {
        return reply.code(400).send({ error: 'Invalid periodEnd' })
      }
      if (status !== undefined && !isNonEmptyString(status)) {
        return reply.code(400).send({ error: 'Invalid status' })
      }
      if (!isNullableString(ownerId)) {
        return reply.code(400).send({ error: 'Invalid ownerId' })
      }
      if (typeof ownerId === 'string' && ownerId.trim() === '') {
        return reply.code(400).send({ error: 'Invalid ownerId' })
      }

      const existing = await prisma.project.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send({ error: 'Project not found' })
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
      if (status !== undefined) {
        data.status = status.trim()
      }
      if (ownerId !== undefined) {
        data.owner =
          ownerId === null
            ? { disconnect: true }
            : {
                connect: {
                  id: ownerId,
                },
              }
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
        return reply.code(404).send({ error: 'Project not found' })
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
        return reply.code(404).send({ error: 'Project not found' })
      }

      const wholesales = await prisma.wholesale.findMany({
        where: { projectId: request.params.id },
        orderBy: { createdAt: 'desc' },
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
        return reply.code(404).send({ error: 'Company not found' })
      }

      const projects = await prisma.project.findMany({
        where: { companyId: request.params.id },
        orderBy: { createdAt: 'desc' },
      })

      return { projects }
    }
  )
}
