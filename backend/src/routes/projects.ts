import { FastifyInstance } from 'fastify'
import { Prisma, ProjectStatus } from '@prisma/client'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
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

interface ProjectSearchQuery {
  q?: string
  companyId?: string
  limit?: string
}

const dateSchema = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string()
)
const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

const projectSchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    name: z.string(),
    conditions: z.string().nullable().optional(),
    unitPrice: z.number().nullable().optional(),
    periodStart: dateSchema.nullable().optional(),
    periodEnd: dateSchema.nullable().optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    ownerId: z.string().nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
    company: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
  })
  .passthrough()

const wholesaleSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    companyId: z.string(),
    conditions: z.string().nullable().optional(),
    unitPrice: z.number().nullable().optional(),
    margin: z.number().nullable().optional(),
    status: z.string(),
    agreedDate: dateSchema.nullable().optional(),
    ownerId: z.string().nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
    company: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .optional(),
    owner: z
      .object({
        id: z.string(),
        email: z.string(),
      })
      .nullable()
      .optional(),
    project: z
      .object({
        id: z.string(),
        name: z.string(),
        company: z
          .object({
            id: z.string(),
            name: z.string(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough()

const projectListQuerySchema = z.object({
  q: z.string().optional(),
  companyId: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  sort: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

const projectSearchQuerySchema = z.object({
  q: z.string().min(1),
  companyId: z.string().optional(),
  limit: z.string().optional(),
})

const projectCreateBodySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  conditions: z.string().optional(),
  unitPrice: z.number().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.string().optional(),
})

const projectUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  conditions: z.string().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.string().nullable().optional(),
})

const projectParamsSchema = z.object({ id: z.string().min(1) })

const projectResponseSchema = z.object({ project: projectSchema }).passthrough()
const projectListResponseSchema = z
  .object({
    items: z.array(projectSchema),
    pagination: paginationSchema,
  })
  .passthrough()
const projectSearchResponseSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          companyId: z.string().optional(),
          company: z
            .object({
              id: z.string(),
              name: z.string(),
            })
            .optional(),
        })
        .passthrough()
    ),
  })
  .passthrough()
const projectWholesalesResponseSchema = z
  .object({
    wholesales: z.array(wholesaleSchema),
  })
  .passthrough()
const companyProjectsResponseSchema = z
  .object({
    projects: z.array(projectSchema),
  })
  .passthrough()

export async function projectRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: ProjectListQuery }>(
    '/projects',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        querystring: projectListQuerySchema,
        response: {
          200: projectListResponseSchema,
        },
      },
    },
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

  app.get<{ Querystring: ProjectSearchQuery }>(
    '/projects/search',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        querystring: projectSearchQuerySchema,
        response: {
          200: projectSearchResponseSchema,
        },
      },
    },
    async (request, reply) => {
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
  )

  app.post<{ Body: ProjectCreateBody }>(
    '/projects',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Projects'],
        body: projectCreateBodySchema,
        response: {
          201: projectResponseSchema,
        },
      },
    },
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

  app.get<{ Params: { id: string } }>(
    '/projects/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          200: projectResponseSchema,
        },
      },
    },
    async (request, reply) => {
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
  )

  app.patch<{ Params: { id: string }; Body: ProjectUpdateBody }>(
    '/projects/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        body: projectUpdateBodySchema,
        response: {
          200: projectResponseSchema,
        },
      },
    },
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

  app.delete<{ Params: { id: string } }>(
    '/projects/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
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

  app.get<{ Params: { id: string } }>(
    '/projects/:id/wholesales',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          200: projectWholesalesResponseSchema,
        },
      },
    },
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

  app.get<{ Params: { id: string } }>(
    '/companies/:id/projects',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Projects'],
        params: projectParamsSchema,
        response: {
          200: companyProjectsResponseSchema,
        },
      },
    },
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
