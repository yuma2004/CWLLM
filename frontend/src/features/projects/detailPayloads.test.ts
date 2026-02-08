import { describe, expect, it } from 'vitest'
import {
  buildProjectUpdatePayload,
  buildWholesaleCreatePayload,
  buildWholesaleUpdatePayload,
  validateProjectUpdateForm,
} from './detailPayloads'

describe('project detail payload helpers', () => {
  it('validates project update form', () => {
    expect(
      validateProjectUpdateForm({
        name: '',
        status: 'active',
        unitPrice: '',
        conditions: '',
        periodStart: '',
        periodEnd: '',
        ownerId: '',
      })
    ).toBe('missing-name')
    expect(
      validateProjectUpdateForm({
        name: 'Project A',
        status: 'active',
        unitPrice: '',
        conditions: '',
        periodStart: '',
        periodEnd: '',
        ownerId: '',
      })
    ).toBeNull()
  })

  it('builds project update payload', () => {
    expect(
      buildProjectUpdatePayload({
        name: '  Project A  ',
        status: 'active',
        unitPrice: '5000',
        conditions: '  monthly  ',
        periodStart: '2026-02-01',
        periodEnd: '2026-03-01',
        ownerId: 'user-1',
      })
    ).toEqual({
      name: 'Project A',
      status: 'active',
      unitPrice: 5000,
      conditions: 'monthly',
      periodStart: '2026-02-01',
      periodEnd: '2026-03-01',
      ownerId: 'user-1',
    })
  })

  it('builds wholesale create payload', () => {
    expect(
      buildWholesaleCreatePayload('project-1', {
        companyId: 'company-1',
        status: 'active',
        unitPrice: '100',
        conditions: 'monthly',
        agreedDate: '2026-02-02',
      })
    ).toEqual({
      projectId: 'project-1',
      companyId: 'company-1',
      status: 'active',
      unitPrice: 100,
      conditions: 'monthly',
      agreedDate: '2026-02-02',
    })
  })

  it('builds wholesale update payload', () => {
    expect(
      buildWholesaleUpdatePayload({
        status: 'closed',
        unitPrice: '',
        conditions: '',
        agreedDate: '',
      })
    ).toEqual({
      status: 'closed',
      unitPrice: null,
      conditions: null,
      agreedDate: null,
    })
  })
})
