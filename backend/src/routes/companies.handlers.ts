import { FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import {
  CACHE_KEYS,
  CACHE_TTLS_MS,
  badRequest,
  buildPaginatedResponse,
  deleteCache,
  generateSortKey,
  getCache,
  handlePrismaError,
  isNonEmptyString,
  isNullableString,
  normalizeCompanyName,
  notFound,
  parseLimit,
  parsePagination,
  parseStringArray,
  prisma,
  setCache,
} from '../utils'
import {
  buildCompanyListWhere,
  buildCompanySearchWhere,
} from '../services/companies/companyQuery'
import {
  validateCompanyCreatePayload,
  validateCompanyUpdatePayload,
} from '../services/companies/companyValidation'
import { mergeCompanies } from '../services/companies/companyMutations'
import {
  CompanyCreateBody,
  CompanyListQuery,
  CompanyMergeBody,
  CompanySearchQuery,
  CompanyUpdateBody,
  ContactCreateBody,
  ContactReorderBody,
  ContactUpdateBody,
} from './companies.schemas'

const prismaErrorOverrides = {
  P2002: { status: 409, message: 'Duplicate record' },
}

export const listCompaniesHandler = async (
  request: FastifyRequest<{ Querystring: CompanyListQuery }>
) => {
  const { page, pageSize, skip } = parsePagination(
    request.query.page,
    request.query.pageSize,
    1000
  )
  const where = buildCompanyListWhere(request.query)

  const [items, total] = await prisma.$transaction([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.company.count({ where }),
  ])

  return buildPaginatedResponse(items, page, pageSize, total)
}

export const searchCompaniesHandler = async (
  request: FastifyRequest<{ Querystring: CompanySearchQuery }>,
  reply: FastifyReply
) => {
  const rawQuery = request.query.q?.trim() ?? ''
  if (!rawQuery) {
    return reply.code(400).send(badRequest('q is required'))
  }

  const limit = parseLimit(request.query.limit)

  const items = await prisma.company.findMany({
    where: buildCompanySearchWhere(rawQuery),
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

export const createCompanyHandler = async (
  request: FastifyRequest<{ Body: CompanyCreateBody }>,
  reply: FastifyReply
) => {
  const { name, category, status, profile, ownerIds } = request.body
  const tags = parseStringArray(request.body.tags)
  const validationError = validateCompanyCreatePayload({ name, ownerIds, tags })
  if (validationError) {
    return reply.code(400).send(badRequest(validationError))
  }

  try {
    const normalizedName = normalizeCompanyName(name)
    const existing = await prisma.company.findUnique({
      where: { normalizedName },
      select: { id: true, name: true },
    })
    if (existing) {
      return reply.code(409).send({
        error: 'Company already exists',
        company: existing,
      })
    }
    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        normalizedName,
        category,
        status,
        profile,
        ownerIds: ownerIds ?? [],
        tags: tags ?? [],
      },
    })
    deleteCache(CACHE_KEYS.companyOptions)
    return reply.code(201).send({ company })
  } catch (error) {
    return handlePrismaError(reply, error, prismaErrorOverrides)
  }
}

export const getCompanyHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const company = await prisma.company.findUnique({
    where: { id: request.params.id },
  })

  if (!company) {
    return reply.code(404).send(notFound('Company'))
  }

  return { company }
}

export const updateCompanyHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: CompanyUpdateBody }>,
  reply: FastifyReply
) => {
  const { name, category, status, profile, ownerIds } = request.body
  const tags = parseStringArray(request.body.tags)
  const validationError = validateCompanyUpdatePayload({
    name,
    category,
    status,
    profile,
    ownerIds,
    tags,
  })
  if (validationError) {
    return reply.code(400).send(badRequest(validationError))
  }
  const safeTags = tags === null ? undefined : tags

  const data: Prisma.CompanyUpdateInput = {}
  if (name !== undefined) {
    const normalizedName = normalizeCompanyName(name)
    const duplicate = await prisma.company.findFirst({
      where: { normalizedName, id: { not: request.params.id } },
      select: { id: true, name: true },
    })
    if (duplicate) {
      return reply.code(409).send({
        error: 'Company already exists',
        company: duplicate,
      })
    }
    data.name = name.trim()
    data.normalizedName = normalizedName
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
  if (safeTags !== undefined) {
    data.tags = safeTags
  }
  if (ownerIds !== undefined) {
    data.ownerIds = ownerIds
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
    deleteCache(CACHE_KEYS.companyOptions)
    return { company }
  } catch (error) {
    return handlePrismaError(reply, error, prismaErrorOverrides)
  }
}

export const deleteCompanyHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
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
    deleteCache(CACHE_KEYS.companyOptions)
    return reply.code(204).send()
  } catch (error) {
    return handlePrismaError(reply, error, prismaErrorOverrides)
  }
}

export const listCompanyContactsHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const company = await prisma.company.findUnique({
    where: { id: request.params.id },
  })
  if (!company) {
    return reply.code(404).send(notFound('Company'))
  }

  const contacts = await prisma.contact.findMany({
    where: { companyId: request.params.id },
    orderBy: [{ sortKey: 'asc' }, { createdAt: 'asc' }],
  })

  return { contacts }
}

export const createCompanyContactHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: ContactCreateBody }>,
  reply: FastifyReply
) => {
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

  const contact = await prisma.contact.create({
    data: {
      companyId: request.params.id,
      name: name.trim(),
      role,
      email,
      phone,
      memo,
      sortKey: generateSortKey(),
    },
  })

  return reply.code(201).send({ contact })
}

export const updateContactHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: ContactUpdateBody }>,
  reply: FastifyReply
) => {
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

export const deleteContactHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    await prisma.contact.delete({
      where: { id: request.params.id },
    })
    return reply.code(204).send()
  } catch (error) {
    return handlePrismaError(reply, error, prismaErrorOverrides)
  }
}

export const reorderContactsHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: ContactReorderBody }>,
  reply: FastifyReply
) => {
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

  const updates = orderedIds.map((contactId, index) => {
    return prisma.contact.update({
      where: { id: contactId },
      data: { sortOrder: index + 1, sortKey: generateSortKey() },
    })
  })

  await prisma.$transaction(updates)

  return reply.code(204).send()
}

export const getCompanyOptionsHandler = async () => {
  const cacheKey = CACHE_KEYS.companyOptions
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

  setCache(cacheKey, response, CACHE_TTLS_MS.companyOptions)

  return response
}

export const mergeCompanyHandler = async (
  request: FastifyRequest<{ Params: { id: string }; Body: CompanyMergeBody }>,
  reply: FastifyReply
) => {
  const targetCompanyId = request.params.id
  const sourceCompanyId = request.body.sourceCompanyId

  if (!isNonEmptyString(sourceCompanyId)) {
    return reply.code(400).send(badRequest('sourceCompanyId is required'))
  }
  if (sourceCompanyId === targetCompanyId) {
    return reply.code(400).send(badRequest('sourceCompanyId must be different'))
  }

  const updatedCompany = await mergeCompanies(targetCompanyId, sourceCompanyId)
  if (!updatedCompany) {
    return reply.code(404).send(notFound('Company'))
  }

  return { company: updatedCompany }
}
