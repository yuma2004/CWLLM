import { describe, expect, it } from 'vitest'
import {
  validateCompanyCreatePayload,
  validateCompanyUpdatePayload,
} from './companyValidation'

describe('companyValidation', () => {
  it('validates create payload', () => {
    expect(
      validateCompanyCreatePayload({
        name: '',
        ownerIds: [],
        tags: [],
      })
    ).toBe('Name is required')

    expect(
      validateCompanyCreatePayload({
        name: 'Acme',
        ownerIds: ['owner-1', ''],
        tags: [],
      })
    ).toBe('Invalid ownerIds')

    expect(
      validateCompanyCreatePayload({
        name: 'Acme',
        ownerIds: ['owner-1'],
        tags: null,
      })
    ).toBe('Tags must be string array')

    expect(
      validateCompanyCreatePayload({
        name: 'Acme',
        ownerIds: ['owner-1'],
        tags: ['vip'],
      })
    ).toBeNull()
  })

  it('validates update payload', () => {
    expect(
      validateCompanyUpdatePayload({
        name: '',
        category: null,
        profile: null,
        status: 'active',
        ownerIds: [],
        tags: [],
      })
    ).toBe('Name is required')

    expect(
      validateCompanyUpdatePayload({
        name: 'Acme',
        category: 1 as unknown as string,
        profile: null,
        status: 'active',
        ownerIds: [],
        tags: [],
      })
    ).toBe('Invalid payload')

    expect(
      validateCompanyUpdatePayload({
        name: 'Acme',
        category: null,
        profile: null,
        status: '',
        ownerIds: [],
        tags: [],
      })
    ).toBe('Status is required')

    expect(
      validateCompanyUpdatePayload({
        name: 'Acme',
        category: null,
        profile: null,
        status: 'active',
        ownerIds: ['owner-1', ''],
        tags: [],
      })
    ).toBe('Invalid ownerIds')

    expect(
      validateCompanyUpdatePayload({
        name: 'Acme',
        category: null,
        profile: null,
        status: 'active',
        ownerIds: [],
        tags: null,
      })
    ).toBe('Tags must be string array')

    expect(
      validateCompanyUpdatePayload({
        name: 'Acme',
        category: null,
        profile: null,
        status: 'active',
        ownerIds: ['owner-1'],
        tags: ['vip'],
      })
    ).toBeNull()
  })
})
