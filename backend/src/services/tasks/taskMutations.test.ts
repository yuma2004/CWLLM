import { TaskStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { buildTaskUpdateData } from './taskMutations'

describe('taskMutations', () => {
  it('builds update data for title and description', () => {
    const data = buildTaskUpdateData({
      title: '  Follow up  ',
      description: 'notes',
      status: TaskStatus.in_progress,
      dueDate: undefined,
      updateDueDate: false,
      assigneeId: undefined,
    })

    expect(data).toEqual({
      title: 'Follow up',
      description: 'notes',
      status: TaskStatus.in_progress,
    })
  })

  it('supports disconnecting assignee and clearing dueDate', () => {
    const data = buildTaskUpdateData({
      dueDate: null,
      updateDueDate: true,
      assigneeId: null,
    })

    expect(data).toEqual({
      dueDate: null,
      assignee: { disconnect: true },
    })
  })

  it('supports connecting assignee and setting dueDate', () => {
    const dueDate = new Date('2026-02-01T00:00:00.000Z')
    const data = buildTaskUpdateData({
      dueDate,
      updateDueDate: true,
      assigneeId: 'employee-1',
    })

    expect(data).toEqual({
      dueDate,
      assignee: { connect: { id: 'employee-1' } },
    })
  })
})
