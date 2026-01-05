import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'
import { parsePagination } from '../utils/pagination'
import { handlePrismaError, prisma } from '../utils/prisma'
import {
  isNonEmptyString,
  isNullableString,
  parseDate,
  parseNumber,
} from '../utils/validation'
import { JWTUser } from '../types/auth'

interface WholesaleCreateBody {
  projectId: string
  companyId: string
  conditions?: string
  unitPrice?: number
  margin?: number
  status?: string
  agreedDate?: string
  ownerId?: string
}

interface WholesaleUpdateBody {
  projectId?: string
  companyId?: string
  conditions?: string | null
  unitPrice?: number | null
  margin?: number | null
  status?: string
  agreedDate?: string | null
  ownerId?: string | null
}

interface WholesaleListQuery {
  projectId?: string
  companyId?: string
  status?: string
  page?: string
  pageSize?: string
}

export async function wholesaleRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: WholesaleListQuery }>(
    '/wholesales',
    { preHandler: requireAuth() },
    async (request) => {
      const { projectId, companyId, status } = request.query
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

  fastify.post<{ Body: WholesaleCreateBody }>(
    '/wholesales',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { projectId, companyId, conditions, status, ownerId } = request.body
      const unitPrice = parseNumber(request.body.unitPrice)
      const margin = parseNumber(request.body.margin)
      const agreedDate = parseDate(request.body.agreedDate)

      if (!isNonEmptyString(projectId)) {
        return reply.code(400).send({ error: 'projectId is required' })
      }
      if (!isNonEmptyString(companyId)) {
        return reply.code(400).send({ error: 'companyId is required' })
      }
      if (unitPrice === null) {
        return reply.code(400).send({ error: 'Invalid unitPrice' })
      }
      if (margin === null) {
        return reply.code(400).send({ error: 'Invalid margin' })
      }
      if (request.body.agreedDate && !agreedDate) {
        return reply.code(400).send({ error: 'Invalid agreedDate' })
      }
      if (ownerId !== undefined && !isNonEmptyString(ownerId)) {
        return reply.code(400).send({ error: 'Invalid ownerId' })
      }

      const [project, company] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId } }),
        prisma.company.findUnique({ where: { id: companyId } }),
      ])
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      try {
        const wholesale = await prisma.wholesale.create({
          data: {
            projectId,
            companyId,
            conditions,
            unitPrice: unitPrice ?? undefined,
            margin: margin ?? undefined,
            status,
            agreedDate: agreedDate ?? undefined,
            ownerId,
          },
        })

        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Wholesale',
          entityId: wholesale.id,
          action: 'create',
          userId,
          after: wholesale,
        })

        return reply.code(201).send({ wholesale })
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/wholesales/:id',
    { preHandler: requireAuth() },
    async (request, reply) => {
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
        return reply.code(404).send({ error: 'Wholesale not found' })
      }
      return { wholesale }
    }
  )

  fastify.patch<{ Params: { id: string }; Body: WholesaleUpdateBody }>(
    '/wholesales/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { projectId, companyId, conditions, status, ownerId } = request.body
      const unitPrice = parseNumber(request.body.unitPrice)
      const margin = parseNumber(request.body.margin)
      const agreedDate = parseDate(request.body.agreedDate)

      if (projectId !== undefined && !isNonEmptyString(projectId)) {
        return reply.code(400).send({ error: 'Invalid projectId' })
      }
      if (companyId !== undefined && !isNonEmptyString(companyId)) {
        return reply.code(400).send({ error: 'Invalid companyId' })
      }
      if (!isNullableString(conditions)) {
        return reply.code(400).send({ error: 'Invalid conditions' })
      }
      if (unitPrice === null) {
        return reply.code(400).send({ error: 'Invalid unitPrice' })
      }
      if (margin === null) {
        return reply.code(400).send({ error: 'Invalid margin' })
      }
      if (request.body.agreedDate !== undefined && request.body.agreedDate !== null && !agreedDate) {
        return reply.code(400).send({ error: 'Invalid agreedDate' })
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

      const existing = await prisma.wholesale.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send({ error: 'Wholesale not found' })
      }

      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } })
        if (!project) {
          return reply.code(404).send({ error: 'Project not found' })
        }
      }
      if (companyId) {
        const company = await prisma.company.findUnique({ where: { id: companyId } })
        if (!company) {
          return reply.code(404).send({ error: 'Company not found' })
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
      if (unitPrice !== undefined) {
        data.unitPrice = unitPrice
      }
      if (margin !== undefined) {
        data.margin = margin
      }
      if (request.body.agreedDate !== undefined) {
        data.agreedDate = agreedDate ?? null
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
        const wholesale = await prisma.wholesale.update({
          where: { id: request.params.id },
          data,
        })

        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Wholesale',
          entityId: wholesale.id,
          action: 'update',
          userId,
          before: existing,
          after: wholesale,
        })

        return { wholesale }
      } catch (error) {
        return handlePrismaError(reply, error)
      }
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    '/wholesales/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const existing = await prisma.wholesale.findUnique({ where: { id: request.params.id } })
      if (!existing) {
        return reply.code(404).send({ error: 'Wholesale not found' })
      }

      try {
        await prisma.wholesale.delete({ where: { id: request.params.id } })

        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Wholesale',
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
    '/companies/:id/wholesales',
    { preHandler: requireAuth() },
    async (request, reply) => {
      const company = await prisma.company.findUnique({ where: { id: request.params.id } })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
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
  )
}
