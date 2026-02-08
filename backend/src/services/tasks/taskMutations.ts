import { Prisma, TaskStatus, TargetType } from '@prisma/client'
import { connectOrDisconnect, prisma } from '../../utils'

export const ensureTaskTargetExists = async (
  targetType: TargetType,
  targetId: string
) => {
  if (targetType === 'company') {
    return prisma.company.findUnique({ where: { id: targetId } })
  }
  if (targetType === 'project') {
    return prisma.project.findUnique({ where: { id: targetId } })
  }
  if (targetType === 'wholesale') {
    return prisma.wholesale.findUnique({ where: { id: targetId } })
  }
  return null
}

export const buildTaskUpdateData = (input: {
  title?: string
  description?: string | null
  status?: TaskStatus | null
  dueDate?: Date | null
  updateDueDate: boolean
  assigneeId?: string | null
}) => {
  const data: Prisma.TaskUpdateInput = {}

  if (input.title !== undefined) {
    data.title = input.title.trim()
  }
  if (input.description !== undefined) {
    data.description = input.description
  }
  if (input.status !== undefined && input.status !== null) {
    data.status = input.status
  }
  if (input.assigneeId !== undefined) {
    data.assignee = connectOrDisconnect(input.assigneeId)
  }
  if (input.updateDueDate) {
    data.dueDate = input.dueDate ?? null
  }

  return data
}
