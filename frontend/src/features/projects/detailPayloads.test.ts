import { describe, expect, it } from 'vitest'
import {
  buildProjectUpdatePayload,
  buildWholesaleCreatePayload,
  buildWholesaleUpdatePayload,
  validateProjectUpdateForm,
} from './detailPayloads'

describe('案件詳細ペイロードヘルパー', () => {
  it('案件更新フォームの必須項目を検証する', () => {
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

  it('案件更新ペイロードを生成する', () => {
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

  it('卸作成ペイロードを生成する', () => {
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

  it('卸更新ペイロードを生成する', () => {
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
