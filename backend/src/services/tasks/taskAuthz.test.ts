import { describe, expect, it } from 'vitest'
import type { JWTUser } from '../../types/auth'
import {
  buildTaskOwnershipFilter,
  canManageAllTasks,
  resolveTaskAssigneeFilter,
} from './taskAuthz'

const adminUser: JWTUser = { userId: 'admin-1', role: 'admin' }
const employeeUser: JWTUser = { userId: 'employee-1', role: 'employee' }

describe('taskAuthz', () => {
  it('returns true only for admin users', () => {
    expect(canManageAllTasks(adminUser)).toBe(true)
    expect(canManageAllTasks(employeeUser)).toBe(false)
    expect(canManageAllTasks(undefined)).toBe(false)
  })

  it('resolves assignee filter from requested assignee for admin', () => {
    expect(resolveTaskAssigneeFilter(adminUser, 'employee-2')).toBe('employee-2')
    expect(resolveTaskAssigneeFilter(adminUser, undefined)).toBeUndefined()
  })

  it('forces assignee filter to current user for non-admin', () => {
    expect(resolveTaskAssigneeFilter(employeeUser, 'employee-2')).toBe('employee-1')
  })

  it('returns ownership filter only for non-admin users', () => {
    expect(buildTaskOwnershipFilter(adminUser)).toEqual({})
    expect(buildTaskOwnershipFilter(employeeUser)).toEqual({ assigneeId: 'employee-1' })
  })
})
