import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'
import { badRequest, notFound } from '../utils/errors'
import { normalizeCompanyName } from '../utils/normalize'
import { parsePagination } from '../utils/pagination'
import { connectOrDisconnect, handlePrismaError, prisma } from '../utils/prisma'
import { getCache, setCache } from '../utils/ttlCache'
import {
  isNonEmptyString,
  isNullableString,
  parseStringArray,
} from '../utils/validation'
import { JWTUser } from '../types/auth'

const prismaErrorOverrides = {
  P2002: { status: 409, message: 'Duplicate record' },
}

const OPTIONS_CACHE_TTL_MS = 60_000

interface CompanyCreateBody {
  name: string
  category?: string
  status?: string
  tags?: string[]
  profile?: string
  ownerId?: string
}

interface CompanyUpdateBody {
  name?: string
  category?: string | null
  status?: string
  tags?: string[]
  profile?: string | null
  ownerId?: string | null
}

interface CompanyListQuery {
  q?: string
  category?: string
  status?: string
  tag?: string
  ownerId?: string
  page?: string
  pageSize?: string
}

interface CompanySearchQuery {
  q?: string
  limit?: string
}

interface ContactCreateBody {
  name: string
  role?: string
  email?: string
  phone?: string
  memo?: string
}

interface ContactUpdateBody {
  name?: string
  role?: string | null
  email?: string | null
  phone?: string | null
  memo?: string | null
  sortOrder?: number | null
}

interface ContactReorderBody {
  orderedIds: string[]
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

const companySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    normalizedName: z.string().optional(),
    category: z.string().nullable().optional(),
    status: z.string(),
    tags: z.array(z.string()),
    profile: z.string().nullable().optional(),
    ownerId: z.string().nullable().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

const contactSchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    name: z.string(),
    role: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    createdAt: dateSchema.optional(),
    updatedAt: dateSchema.optional(),
  })
  .passthrough()

const companyListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
  ownerId: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
})

const companySearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional(),
})

const companyCreateBodySchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  profile: z.string().optional(),
  ownerId: z.string().optional(),
})

const companyUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  profile: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
})

const contactCreateBodySchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  memo: z.string().optional(),
})

const contactUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).nullable().optional(),
})

const contactReorderBodySchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
})

const companyParamsSchema = z.object({ id: z.string().min(1) })
const contactParamsSchema = z.object({ id: z.string().min(1) })

const companyResponseSchema = z.object({ company: companySchema }).passthrough()
const companyListResponseSchema = z
  .object({
    items: z.array(companySchema),
    pagination: paginationSchema,
  })
  .passthrough()
const companySearchResponseSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          status: z.string().optional(),
          category: z.string().nullable().optional(),
          tags: z.array(z.string()).optional(),
        })
        .passthrough()
    ),
  })
  .passthrough()

const contactListResponseSchema = z
  .object({
    contacts: z.array(contactSchema),
  })
  .passthrough()
const contactResponseSchema = z.object({ contact: contactSchema }).passthrough()

const companyOptionsResponseSchema = z
  .object({
    categories: z.array(z.string()),
    statuses: z.array(z.string()),
    tags: z.array(z.string()),
  })
  .passthrough()

export async function companyRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get<{ Querystring: CompanyListQuery }>(
    '/companies',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        querystring: companyListQuerySchema,
        response: {
          200: companyListResponseSchema,
        },
      },
    },
    async (request) => {
      const { q, category, status, tag, ownerId } = request.query
      const { page, pageSize, skip } = parsePagination(
        request.query.page,
        request.query.pageSize,
        1000
      )

      const where: Prisma.CompanyWhereInput = {}
      if (q && q.trim() !== '') {
        const normalized = normalizeCompanyName(q)
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { normalizedName: { contains: normalized } },
        ]
      }
      if (category) {
        where.category = category
      }
      if (status) {
        where.status = status
      }
      if (tag) {
        where.tags = { has: tag }
      }
      if (ownerId) {
        where.ownerId = ownerId
      }

      const [items, total] = await prisma.$transaction([
        prisma.company.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.company.count({ where }),
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

  app.get<{ Querystring: CompanySearchQuery }>(
    '/companies/search',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        querystring: companySearchQuerySchema,
        response: {
          200: companySearchResponseSchema,
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

      const normalized = normalizeCompanyName(rawQuery)
      const items = await prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: rawQuery, mode: 'insensitive' } },
            { normalizedName: { contains: normalized } },
          ],
        },
        orderBy: { name: 'asc' },
        take: limit,
        select: {
          id: true,
          name: true,
          status: true,
          category: true,
          tags: true,
        },
      })

      return { items }
    }
  )

  app.post<{ Body: CompanyCreateBody }>(
    '/companies',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Companies'],
        body: companyCreateBodySchema,
        response: {
          201: companyResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: CompanyCreateBody }>, reply: FastifyReply) => {
      const { name, category, status, profile, ownerId } = request.body
      const tags = parseStringArray(request.body.tags)

      if (!isNonEmptyString(name)) {
        return reply.code(400).send(badRequest('Name is required'))
      }
      if (tags === null) {
        return reply.code(400).send(badRequest('Tags must be string array'))
      }

      try {
        const normalizedName = normalizeCompanyName(name)
        const company = await prisma.company.create({
          data: {
            name: name.trim(),
            normalizedName,
            category,
            status,
            profile,
            ownerId,
            tags: tags ?? [],
          },
        })
        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Company',
          entityId: company.id,
          action: 'create',
          userId,
          after: company,
        })
        return reply.code(201).send({ company })
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        params: companyParamsSchema,
        response: {
          200: companyResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const company = await prisma.company.findUnique({
        where: { id: request.params.id },
      })

      if (!company) {
        return reply.code(404).send(notFound('Company'))
      }

      return { company }
    }
  )

  app.patch<{ Params: { id: string }; Body: CompanyUpdateBody }>(
    '/companies/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Companies'],
        params: companyParamsSchema,
        body: companyUpdateBodySchema,
        response: {
          200: companyResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, category, status, profile, ownerId } = request.body
      const tags = parseStringArray(request.body.tags)

      if (name !== undefined && !isNonEmptyString(name)) {
        return reply.code(400).send(badRequest('Name is required'))
      }
      if (!isNullableString(category) || !isNullableString(profile)) {
        return reply.code(400).send(badRequest('Invalid payload'))
      }
      if (status !== undefined && !isNonEmptyString(status)) {
        return reply.code(400).send(badRequest('Status is required'))
      }
      if (!isNullableString(ownerId)) {
        return reply.code(400).send(badRequest('Invalid payload'))
      }
      if (typeof ownerId === 'string' && ownerId.trim() === '') {
        return reply.code(400).send(badRequest('Invalid payload'))
      }
      if (tags === null) {
        return reply.code(400).send(badRequest('Tags must be string array'))
      }

      const data: Prisma.CompanyUpdateInput = {}
      if (name !== undefined) {
        data.name = name.trim()
        data.normalizedName = normalizeCompanyName(name)
      }
      if (category !== undefined) {
        data.category = category
      }
      if (status !== undefined) {
        data.status = status.trim()
      }
      if (profile !== undefined) {
        data.profile = profile
      }
      if (tags !== undefined) {
        data.tags = tags
      }
      if (ownerId !== undefined) {
        data.owner = connectOrDisconnect(ownerId)
      }

      const existing = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!existing) {
        return reply.code(404).send(notFound('Company'))
      }

      try {
        const company = await prisma.company.update({
          where: { id: request.params.id },
          data,
        })
        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Company',
          entityId: company.id,
          action: 'update',
          userId,
          before: existing,
          after: company,
        })
        return { company }
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/companies/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Companies'],
        params: companyParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    async (request, reply) => {
      const existing = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!existing) {
        return reply.code(404).send(notFound('Company'))
      }

      try {
        await prisma.company.delete({
          where: { id: request.params.id },
        })
        const userId = (request.user as JWTUser | undefined)?.userId
        await logAudit(prisma, {
          entityType: 'Company',
          entityId: existing.id,
          action: 'delete',
          userId,
          before: existing,
        })
        return reply.code(204).send()
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )

  app.get<{ Params: { id: string } }>(
    '/companies/:id/contacts',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Contacts'],
        params: companyParamsSchema,
        response: {
          200: contactListResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const company = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!company) {
        return reply.code(404).send(notFound('Company'))
      }

      const contacts = await prisma.contact.findMany({
        where: { companyId: request.params.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })

      return { contacts }
    }
  )

  app.post<{ Params: { id: string }; Body: ContactCreateBody }>(
    '/companies/:id/contacts',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: companyParamsSchema,
        body: contactCreateBodySchema,
        response: {
          201: contactResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, role, email, phone, memo } = request.body

      if (!isNonEmptyString(name)) {
        return reply.code(400).send(badRequest('Name is required'))
      }

      const company = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!company) {
        return reply.code(404).send(notFound('Company'))
      }

      const maxOrder = await prisma.contact.aggregate({
        where: { companyId: request.params.id },
        _max: { sortOrder: true },
      })
      const nextSortOrder = (maxOrder._max.sortOrder ?? 0) + 1

      const contact = await prisma.contact.create({
        data: {
          companyId: request.params.id,
          name: name.trim(),
          role,
          email,
          phone,
          memo,
          sortOrder: nextSortOrder,
        },
      })

      return reply.code(201).send({ contact })
    }
  )

  app.patch<{ Params: { id: string }; Body: ContactUpdateBody }>(
    '/contacts/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: contactParamsSchema,
        body: contactUpdateBodySchema,
        response: {
          200: contactResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, role, email, phone, memo } = request.body

      if (name !== undefined && !isNonEmptyString(name)) {
        return reply.code(400).send(badRequest('Name is required'))
      }
      if (!isNullableString(role) || !isNullableString(email)) {
        return reply.code(400).send(badRequest('Invalid payload'))
      }
      if (!isNullableString(phone) || !isNullableString(memo)) {
        return reply.code(400).send(badRequest('Invalid payload'))
      }
      if (request.body.sortOrder !== undefined && request.body.sortOrder !== null) {
        if (!Number.isInteger(request.body.sortOrder) || request.body.sortOrder < 0) {
          return reply.code(400).send(badRequest('Invalid sortOrder'))
        }
      }

      const data: Prisma.ContactUpdateInput = {}
      if (name !== undefined) {
        data.name = name.trim()
      }
      if (role !== undefined) {
        data.role = role
      }
      if (email !== undefined) {
        data.email = email
      }
      if (phone !== undefined) {
        data.phone = phone
      }
      if (memo !== undefined) {
        data.memo = memo
      }
      if (request.body.sortOrder !== undefined && request.body.sortOrder !== null) {
        data.sortOrder = request.body.sortOrder
      }

      try {
        const contact = await prisma.contact.update({
          where: { id: request.params.id },
          data,
        })
        return { contact }
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )

  app.delete<{ Params: { id: string } }>(
    '/contacts/:id',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: contactParamsSchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    async (request, reply) => {
      try {
        await prisma.contact.delete({
          where: { id: request.params.id },
        })
        return reply.code(204).send()
      } catch (error) {
        return handlePrismaError(reply, error, prismaErrorOverrides)
      }
    }
  )

  app.patch<{ Params: { id: string }; Body: ContactReorderBody }>(
    '/companies/:id/contacts/reorder',
    {
      preHandler: requireWriteAccess(),
      schema: {
        tags: ['Contacts'],
        params: companyParamsSchema,
        body: contactReorderBodySchema,
        response: {
          204: z.undefined(),
        },
      },
    },
    async (request, reply) => {
      const { orderedIds } = request.body
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return reply.code(400).send(badRequest('orderedIds is required'))
      }
      if (orderedIds.some((contactId) => !isNonEmptyString(contactId))) {
        return reply.code(400).send(badRequest('Invalid orderedIds'))
      }

      const company = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!company) {
        return reply.code(404).send(notFound('Company'))
      }

      const contacts = await prisma.contact.findMany({
        where: { id: { in: orderedIds }, companyId: request.params.id },
        select: { id: true },
      })
      if (contacts.length !== orderedIds.length) {
        return reply.code(400).send(badRequest('Contacts mismatch'))
      }

      const updates = orderedIds.map((contactId, index) =>
        prisma.contact.update({
          where: { id: contactId },
          data: { sortOrder: index + 1 },
        })
      )

      await prisma.$transaction(updates)

      return reply.code(204).send()
    }
  )

  // 企業の区分、ステータス、タグの候補を取得
  app.get(
    '/companies/options',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['Companies'],
        response: {
          200: companyOptionsResponseSchema,
        },
      },
    },
    async () => {
      const cacheKey = 'companies:options'
      const cached = getCache<{
        categories: string[]
        statuses: string[]
        tags: string[]
      }>(cacheKey)
      if (cached) {
        return cached
      }

      const [categories, statuses, tagRows] = await prisma.$transaction([
        prisma.company.findMany({
          distinct: ['category'],
          where: { category: { not: null } },
          select: { category: true },
        }),
        prisma.company.findMany({
          distinct: ['status'],
          select: { status: true },
        }),
        prisma.$queryRaw<{ tag: string }[]>`
          select distinct unnest("tags") as tag
          from "companies"
          where coalesce(array_length("tags", 1), 0) > 0
        `,
      ])

      const response = {
        categories: categories
          .map((item) => item.category)
          .filter((category): category is string => Boolean(category))
          .sort(),
        statuses: statuses
          .map((item) => item.status)
          .filter((status): status is string => Boolean(status))
          .sort(),
        tags: tagRows
          .map((row) => row.tag)
          .filter((tag): tag is string => Boolean(tag))
          .sort(),
      }

      setCache(cacheKey, response, OPTIONS_CACHE_TTL_MS)

      return response
    }
  )
}
