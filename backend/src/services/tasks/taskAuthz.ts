import type { JWTUser } from '../../types/auth'

export const canManageAllTasks = (user?: JWTUser) => user?.role === 'admin'

export const resolveTaskAssigneeFilter = (
  user: JWTUser,
  requestedAssigneeId?: string
) => {
  if (canManageAllTasks(user)) {
    return requestedAssigneeId
  }
  return user.userId
}

export const buildTaskOwnershipFilter = (user: JWTUser) => {
  if (canManageAllTasks(user)) {
    return {}
  }
  return { assigneeId: user.userId }
}
