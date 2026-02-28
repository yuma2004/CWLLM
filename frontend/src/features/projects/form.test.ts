import { describe, expect, it } from 'vitest'
import {
  buildProjectCreatePayload,
  type ProjectCreateFormState,
  validateProjectCreateForm,
} from './form'

describe('案件作成フォームヘルパー', () => {
  it('必須項目を検証する', () => {
    expect(
      validateProjectCreateForm({
        companyId: '',
        name: '',
        status: 'active',
        unitPrice: '',
        conditions: '',
        periodStart: '',
        periodEnd: '',
        ownerId: '',
      })
    ).toBe('missing-company-or-name')

    expect(
      validateProjectCreateForm({
        companyId: 'company-1',
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

  it('フォーム入力から作成ペイロードを生成する', () => {
    const form: ProjectCreateFormState = {
      companyId: '  company-1  ',
      name: '  Project A  ',
      status: 'active',
      unitPrice: '1200',
      conditions: '  monthly  ',
      periodStart: '2026-02-01',
      periodEnd: '2026-03-01',
      ownerId: 'user-1',
    }

    expect(buildProjectCreatePayload(form)).toEqual({
      companyId: 'company-1',
      name: 'Project A',
      status: 'active',
      unitPrice: 1200,
      conditions: 'monthly',
      periodStart: '2026-02-01',
      periodEnd: '2026-03-01',
      ownerId: 'user-1',
    })
  })

  it('任意項目が空文字のときはペイロードから除外する', () => {
    const form: ProjectCreateFormState = {
      companyId: 'company-1',
      name: 'Project A',
      status: '',
      unitPrice: '',
      conditions: '  ',
      periodStart: '',
      periodEnd: '',
      ownerId: '',
    }

    expect(buildProjectCreatePayload(form)).toEqual({
      companyId: 'company-1',
      name: 'Project A',
    })
  })
})
