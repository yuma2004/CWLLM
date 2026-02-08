import { TaskStatus, TargetType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import {
  TASK_FILTER_ERROR_MESSAGES,
  buildTaskWhere,
  parseTaskListFilters,
} from './taskQuery'

describe('taskQuery', () => {
  it('parses valid list filters', () => {
    const parsed = parseTaskListFilters({
      q: '  Follow up  ',
      status: 'todo',
      targetType: 'company',
      dueFrom: '2026-01-01',
      dueTo: '2026-01-31',
    })

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.q).toBe('Follow up')
    expect(parsed.status).toBe(TaskStatus.todo)
    expect(parsed.targetType).toBe(TargetType.company)
    expect(parsed.dueFrom).toBeInstanceOf(Date)
    expect(parsed.dueTo).toBeInstanceOf(Date)
  })

  it('returns explicit error when status is invalid', () => {
    const parsed = parseTaskListFilters({ status: 'wrong' })
    expect(parsed).toEqual({
      ok: false,
      error: TASK_FILTER_ERROR_MESSAGES.status,
    })
  })

  it('returns explicit error when due date is invalid', () => {
    const parsed = parseTaskListFilters({ dueFrom: 'not-a-date' })
    expect(parsed).toEqual({
      ok: false,
      error: TASK_FILTER_ERROR_MESSAGES.dueFrom,
    })
  })

  it('builds prisma where clause from parsed filters', () => {
    const dueFrom = new Date('2026-01-01T00:00:00.000Z')
    const dueTo = new Date('2026-01-31T00:00:00.000Z')
    const where = buildTaskWhere(
      {
        ok: true,
        q: 'Follow up',
        status: TaskStatus.todo,
        targetType: TargetType.company,
        dueFrom,
        dueTo,
      },
      {
        assigneeId: 'employee-1',
        targetType: TargetType.company,
        targetId: 'company-1',
      }
    )

    expect(where).toMatchObject({
      assigneeId: 'employee-1',
      targetType: TargetType.company,
      targetId: 'company-1',
      status: TaskStatus.todo,
      OR: [
        { title: { contains: 'Follow up', mode: 'insensitive' } },
        { description: { contains: 'Follow up', mode: 'insensitive' } },
      ],
    })
    expect(where.dueDate).toEqual({ gte: dueFrom, lte: dueTo })
  })
})
