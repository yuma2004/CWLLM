import { describe, expect, it } from 'vitest'
import {
  GENERAL_TASK_TARGET_ID,
  buildTaskCreatePayload,
  validateTaskCreateForm,
} from './createForm'

describe('task create form helpers', () => {
  it('validates required fields', () => {
    expect(
      validateTaskCreateForm({
        targetType: 'company',
        title: '',
        companyId: '',
      })
    ).toEqual({
      title: true,
      companyId: true,
    })

    expect(
      validateTaskCreateForm({
        targetType: 'general',
        title: '',
        companyId: '',
      })
    ).toEqual({
      title: true,
    })
  })

  it('builds payload for company target', () => {
    expect(
      buildTaskCreatePayload({
        targetType: 'company',
        title: '  Follow up  ',
        description: '  details  ',
        dueDate: '2026-02-01',
        companyId: 'company-1',
        assigneeId: 'user-1',
      })
    ).toEqual({
      targetType: 'company',
      targetId: 'company-1',
      title: 'Follow up',
      description: 'details',
      dueDate: '2026-02-01',
      assigneeId: 'user-1',
    })
  })

  it('builds payload for general target', () => {
    expect(
      buildTaskCreatePayload({
        targetType: 'general',
        title: 'Internal',
        description: '',
        dueDate: '',
        companyId: '',
        assigneeId: '',
      })
    ).toEqual({
      targetType: 'general',
      targetId: GENERAL_TASK_TARGET_ID,
      title: 'Internal',
    })
  })
})
