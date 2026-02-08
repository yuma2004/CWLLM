type TaskIdItem = { id: string }

export const toggleTaskSelection = (selectedIds: string[], taskId: string) => {
  if (selectedIds.includes(taskId)) {
    return selectedIds.filter((id) => id !== taskId)
  }
  return [...selectedIds, taskId]
}

export const toggleSelectAllTaskIds = (allSelected: boolean, tasks: TaskIdItem[]) => {
  if (allSelected) {
    return []
  }
  return tasks.map((task) => task.id)
}

export type BulkTaskUpdateValidation =
  | { ok: true }
  | { ok: false; reason: 'missing-task-ids' | 'missing-fields' }

export const validateBulkTaskUpdateInput = (
  selectedIds: string[],
  bulkStatus: string,
  bulkDueDate: string,
  clearBulkDueDate: boolean
): BulkTaskUpdateValidation => {
  if (selectedIds.length === 0) {
    return { ok: false, reason: 'missing-task-ids' }
  }
  if (!bulkStatus && !bulkDueDate && !clearBulkDueDate) {
    return { ok: false, reason: 'missing-fields' }
  }
  return { ok: true }
}

export const buildBulkTaskUpdatePayload = (
  selectedIds: string[],
  bulkStatus: string,
  bulkDueDate: string,
  clearBulkDueDate: boolean
) => {
  const payload: {
    taskIds: string[]
    status?: string
    dueDate?: string | null
  } = { taskIds: selectedIds }

  if (bulkStatus) {
    payload.status = bulkStatus
  }
  if (bulkDueDate) {
    payload.dueDate = bulkDueDate
  }
  if (clearBulkDueDate) {
    payload.dueDate = null
  }

  return payload
}
