import { describe, expect, it } from 'vitest'
import { buildCompanyListWhere, buildCompanySearchWhere } from './companyQuery'

describe('companyQuery', () => {
  it('builds list where clause from all supported filters', () => {
    const where = buildCompanyListWhere({
      q: 'Acme',
      category: 'media',
      status: 'active',
      tag: 'vip',
      ownerId: 'owner-1',
    })

    expect(where).toMatchObject({
      category: 'media',
      status: 'active',
      tags: { has: 'vip' },
      ownerIds: { has: 'owner-1' },
      OR: [
        { name: { contains: 'Acme', mode: 'insensitive' } },
        { normalizedName: { contains: 'acme' } },
      ],
    })
  })

  it('builds search where clause from raw query', () => {
    const where = buildCompanySearchWhere('Acme')

    expect(where).toEqual({
      OR: [
        { name: { contains: 'Acme', mode: 'insensitive' } },
        { normalizedName: { contains: 'acme' } },
      ],
    })
  })
})
