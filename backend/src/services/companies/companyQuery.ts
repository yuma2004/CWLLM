import { Prisma } from '@prisma/client'
import { CompanyListQuery } from '../../routes/companies.schemas'
import { normalizeCompanyName } from '../../utils'

type CompanyListFilters = Pick<
  CompanyListQuery,
  'q' | 'category' | 'status' | 'tag' | 'ownerId'
>

export const buildCompanyListWhere = (filters: CompanyListFilters) => {
  const { q, category, status, tag, ownerId } = filters
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
    where.ownerIds = { has: ownerId }
  }

  return where
}

export const buildCompanySearchWhere = (rawQuery: string) => {
  const normalized = normalizeCompanyName(rawQuery)
  return {
    OR: [
      { name: { contains: rawQuery, mode: 'insensitive' } },
      { normalizedName: { contains: normalized } },
    ],
  } satisfies Prisma.CompanyWhereInput
}
