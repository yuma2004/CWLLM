import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma, PrismaClient } from '@prisma/client'
import { requireAuth, requireWriteAccess } from '../middleware/rbac'
import { normalizeCompanyName } from '../utils/normalize'
import { logAudit } from '../services/audit'

const prisma = new PrismaClient()

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isNullableString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === 'string'

const parseTags = (value: unknown): string[] | undefined | null => {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return null
  if (value.some((tag) => typeof tag !== 'string')) return null
  return value
}

const handlePrismaError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.code(409).send({ error: 'Duplicate record' })
    }
    if (error.code === 'P2003') {
      return reply.code(400).send({ error: 'Invalid relation' })
    }
    if (error.code === 'P2025') {
      return reply.code(404).send({ error: 'Not found' })
    }
  }
  return reply.code(500).send({ error: 'Internal server error' })
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
}

interface JWTUser {
  userId: string
  role: string
}

export async function companyRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: CompanyListQuery }>(
    '/companies',
    { preHandler: requireAuth() },
    async (request) => {
      const { q, category, status, tag, ownerId } = request.query
      const page = Math.max(Number(request.query.page) || 1, 1)
      const pageSize = Math.min(Math.max(Number(request.query.pageSize) || 20, 1), 100)
      const skip = (page - 1) * pageSize

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

  fastify.post<{ Body: CompanyCreateBody }>(
    '/companies',
    { preHandler: requireWriteAccess() },
    async (request: FastifyRequest<{ Body: CompanyCreateBody }>, reply: FastifyReply) => {
      const { name, category, status, profile, ownerId } = request.body
      const tags = parseTags(request.body.tags)

      if (!isNonEmptyString(name)) {
        return reply.code(400).send({ error: 'Name is required' })
      }
      if (tags === null) {
        return reply.code(400).send({ error: 'Tags must be string array' })
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
        return handlePrismaError(reply, error)
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
        return reply.code(404).send({ error: 'Company not found' })
      }

      return { company }
    }
  )

  fastify.patch<{ Params: { id: string }; Body: CompanyUpdateBody }>(
    '/companies/:id',
    { preHandler: requireWriteAccess() },
    async (request, reply) => {
      const { name, category, status, profile, ownerId } = request.body
      const tags = parseTags(request.body.tags)

      if (name !== undefined && !isNonEmptyString(name)) {
        return reply.code(400).send({ error: 'Name is required' })
      }
      if (!isNullableString(category) || !isNullableString(profile)) {
        return reply.code(400).send({ error: 'Invalid payload' })
      }
      if (status !== undefined && !isNonEmptyString(status)) {
        return reply.code(400).send({ error: 'Status is required' })
      }
      if (!isNullableString(ownerId)) {
        return reply.code(400).send({ error: 'Invalid payload' })
      }
      if (typeof ownerId === 'string' && ownerId.trim() === '') {
        return reply.code(400).send({ error: 'Invalid payload' })
      }
      if (tags === null) {
        return reply.code(400).send({ error: 'Tags must be string array' })
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
        data.owner =
          ownerId === null
            ? { disconnect: true }
            : {
                connect: {
                  id: ownerId,
                },
              }
      }

      const existing = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!existing) {
        return reply.code(404).send({ error: 'Company not found' })
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
        return handlePrismaError(reply, error)
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
        return reply.code(404).send({ error: 'Company not found' })
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
        return handlePrismaError(reply, error)
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
        return reply.code(404).send({ error: 'Company not found' })
      }

      const contacts = await prisma.contact.findMany({
        where: { companyId: request.params.id },
        orderBy: { createdAt: 'asc' },
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
        return reply.code(400).send({ error: 'Name is required' })
      }

      const company = await prisma.company.findUnique({
        where: { id: request.params.id },
      })
      if (!company) {
        return reply.code(404).send({ error: 'Company not found' })
      }

      const contact = await prisma.contact.create({
        data: {
          companyId: request.params.id,
          name: name.trim(),
          role,
          email,
          phone,
          memo,
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
        return reply.code(400).send({ error: 'Name is required' })
      }
      if (!isNullableString(role) || !isNullableString(email)) {
        return reply.code(400).send({ error: 'Invalid payload' })
      }
      if (!isNullableString(phone) || !isNullableString(memo)) {
        return reply.code(400).send({ error: 'Invalid payload' })
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

      try {
        const contact = await prisma.contact.update({
          where: { id: request.params.id },
          data,
        })
        return { contact }
      } catch (error) {
        return handlePrismaError(reply, error)
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
        return handlePrismaError(reply, error)
      }
    }
  )
}
