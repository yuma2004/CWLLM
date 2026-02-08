export type TaskCreateTargetType = 'company' | 'general'

export type TaskCreateFormState = {
  targetType: TaskCreateTargetType
  title: string
  description: string
  dueDate: string
  companyId: string
  assigneeId: string
}

export const GENERAL_TASK_TARGET_ID = 'general'

export const validateTaskCreateForm = (form: Pick<TaskCreateFormState, 'targetType' | 'title' | 'companyId'>) => {
  const errors: { title?: true; companyId?: true } = {}
  if (!form.title.trim()) {
    errors.title = true
  }
  if (form.targetType === 'company' && !form.companyId) {
    errors.companyId = true
  }
  return errors
}

export const buildTaskCreatePayload = (form: TaskCreateFormState) => {
  const trimmedDescription = form.description.trim()
  return {
    targetType: form.targetType,
    targetId: form.targetType === 'general' ? GENERAL_TASK_TARGET_ID : form.companyId,
    title: form.title.trim(),
    description: trimmedDescription || undefined,
    dueDate: form.dueDate || undefined,
    assigneeId: form.assigneeId || undefined,
  }
}
