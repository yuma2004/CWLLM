import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { logAudit } from '../services/audit'
import { badRequest, notFound } from '../utils/errors'
import { normalizeCompanyName } from '../utils/normalize'
import { parsePagination } from '../utils/pagination'
import { connectOrDisconnect, handlePrismaError, prisma } from '../utils/prisma'
import {
  isNonEmptyString,
  isNullableString,
  parseStringArray,
} from '../utils/validation'
import { JWTUser } from '../types/auth'

const prismaErrorOverrides = {
  P2002: { status: 409, message: 'Duplicate record' },
}

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

export async function companyRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: CompanyListQuery }>(
    '/companies',
    { preHandler: requireAuth() },
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

  fastify.get<{ Querystring: CompanySearchQuery }>(
    '/companies/search',
    { preHandler: requireAuth() },
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

  fastify.post<{ Body: CompanyCreateBody }>(
    '/companies',
    { preHandler: requireWriteAccess() },
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

  fastify.get<{ Params: { id: string } }>(
    '/companies/:id',
    { preHandler: requireAuth() },
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

  fastify.patch<{ Params: { id: string }; Body: CompanyUpdateBody }>(
    '/companies/:id',
    { preHandler: requireWriteAccess() },
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

  fastify.delete<{ Params: { id: string } }>(
    '/companies/:id',
    { preHandler: requireWriteAccess() },
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

  fastify.get<{ Params: { id: string } }>(
    '/companies/:id/contacts',
    { preHandler: requireAuth() },
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

  fastify.post<{ Params: { id: string }; Body: ContactCreateBody }>(
    '/companies/:id/contacts',
    { preHandler: requireWriteAccess() },
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

  fastify.patch<{ Params: { id: string }; Body: ContactUpdateBody }>(
    '/contacts/:id',
    { preHandler: requireWriteAccess() },
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
      if (request.body.sortOrder !== undefined) {
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

  fastify.delete<{ Params: { id: string } }>(
    '/contacts/:id',
    { preHandler: requireWriteAccess() },
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

  fastify.patch<{ Params: { id: string }; Body: ContactReorderBody }>(
    '/companies/:id/contacts/reorder',
    { preHandler: requireWriteAccess() },
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
  fastify.get('/companies/options', { preHandler: requireAuth() }, async () => {
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

    return {
      categories: categories.map((item) => item.category).filter(Boolean).sort(),
      statuses: statuses.map((item) => item.status).filter(Boolean).sort(),
      tags: tagRows.map((row) => row.tag).filter(Boolean).sort(),
    }
  })
}
