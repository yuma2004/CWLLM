import { describe, expect, it } from 'vitest'
import {
  buildBulkTaskUpdatePayload,
  toggleSelectAllTaskIds,
  toggleTaskSelection,
  validateBulkTaskUpdateInput,
} from './state'

describe('tasks state helpers', () => {
  it('toggles individual selection', () => {
    expect(toggleTaskSelection([], 't1')).toEqual(['t1'])
    expect(toggleTaskSelection(['t1', 't2'], 't1')).toEqual(['t2'])
  })

  it('toggles select all', () => {
    const tasks = [{ id: 't1' }, { id: 't2' }]
    expect(toggleSelectAllTaskIds(false, tasks)).toEqual(['t1', 't2'])
    expect(toggleSelectAllTaskIds(true, tasks)).toEqual([])
  })

  it('validates bulk update input', () => {
    expect(validateBulkTaskUpdateInput([], '', '', false)).toEqual({
      ok: false,
      reason: 'missing-task-ids',
    })
    expect(validateBulkTaskUpdateInput(['t1'], '', '', false)).toEqual({
      ok: false,
      reason: 'missing-fields',
    })
    expect(validateBulkTaskUpdateInput(['t1'], 'done', '', false)).toEqual({ ok: true })
  })

  it('builds bulk update payload', () => {
    expect(buildBulkTaskUpdatePayload(['t1'], 'done', '', false)).toEqual({
      taskIds: ['t1'],
      status: 'done',
    })

    expect(buildBulkTaskUpdatePayload(['t1'], '', '2026-02-01', false)).toEqual({
      taskIds: ['t1'],
      dueDate: '2026-02-01',
    })

    expect(buildBulkTaskUpdatePayload(['t1'], '', '', true)).toEqual({
      taskIds: ['t1'],
      dueDate: null,
    })
  })
})
