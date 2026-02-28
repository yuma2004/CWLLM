import { describe, expect, it } from 'vitest'
import {
  buildBulkTaskUpdatePayload,
  toggleSelectAllTaskIds,
  toggleTaskSelection,
  validateBulkTaskUpdateInput,
} from './state'

describe('タスク状態ヘルパー', () => {
  it('単一タスクの選択状態を切り替える', () => {
    expect(toggleTaskSelection([], 't1')).toEqual(['t1'])
    expect(toggleTaskSelection(['t1', 't2'], 't1')).toEqual(['t2'])
  })

  it('全選択の状態を切り替える', () => {
    const tasks = [{ id: 't1' }, { id: 't2' }]
    expect(toggleSelectAllTaskIds(false, tasks)).toEqual(['t1', 't2'])
    expect(toggleSelectAllTaskIds(true, tasks)).toEqual([])
  })

  it('一括更新入力を検証する', () => {
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

  it('一括更新ペイロードを生成する', () => {
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
