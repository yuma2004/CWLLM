import { FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation } from '../../hooks/useApi'
import { apiRoutes } from '../../lib/apiRoutes'
import { TASK_STRINGS } from '../../strings/tasks'
import { toErrorMessage } from '../../utils/errorState'
import {
  buildTaskCreatePayload,
  type TaskCreateFormState,
  validateTaskCreateForm,
} from './createForm'
import type { Task } from '../../types'
import type { ToastState } from '../../hooks/useToast'

type TaskCreateMutationPayload = {
  targetType: string
  targetId: string
  title: string
  description?: string
  dueDate?: string
  assigneeId?: string
}

type UseTaskCreatePanelOptions = {
  canWrite: boolean
  refetchTasks: () => Promise<unknown> | null
  showToast: (message: string, variant: ToastState['variant']) => void
}

export const useTaskCreatePanel = ({
  canWrite,
  refetchTasks,
  showToast,
}: UseTaskCreatePanelOptions) => {
  const createTitleRef = useRef<HTMLInputElement>(null)
  const createCompanyRef = useRef<HTMLInputElement>(null)
  const [createForm, setCreateForm] = useState<TaskCreateFormState>({
    targetType: 'company',
    title: '',
    description: '',
    dueDate: '',
    companyId: '',
    assigneeId: '',
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createFieldErrors, setCreateFieldErrors] = useState<{
    title?: string
    companyId?: string
  }>({})
  const [createError, setCreateError] = useState('')

  const { mutate: createTask, isLoading: isCreating } = useMutation<
    { task: Task },
    TaskCreateMutationPayload
  >(apiRoutes.tasks.base(), 'POST')

  const isCreateDirty = canWrite
    ? Boolean(
        createForm.title.trim() ||
          createForm.description.trim() ||
          createForm.dueDate ||
          createForm.companyId ||
          createForm.assigneeId
      )
    : false

  useEffect(() => {
    if (!isCreateDirty) return undefined
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isCreateDirty])

  useEffect(() => {
    if (!isCreateOpen) return
    const frameId = window.requestAnimationFrame(() => {
      createTitleRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [isCreateOpen])

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault()
    setCreateError('')

    const validationErrors = validateTaskCreateForm(createForm)
    const nextErrors: { title?: string; companyId?: string } = {
      ...(validationErrors.title ? { title: TASK_STRINGS.errors.createTitleRequired } : {}),
      ...(validationErrors.companyId
        ? { companyId: TASK_STRINGS.errors.createCompanyRequired }
        : {}),
    }

    if (Object.keys(nextErrors).length > 0) {
      setCreateFieldErrors(nextErrors)
      if (nextErrors.title) {
        createTitleRef.current?.focus()
      } else if (nextErrors.companyId) {
        createCompanyRef.current?.focus()
      }
      return
    }

    setCreateFieldErrors({})

    try {
      await createTask(buildTaskCreatePayload(createForm), {
        authMode: 'bearer',
        errorMessage: TASK_STRINGS.errors.create,
      })
      showToast(TASK_STRINGS.success.create, 'success')
      setCreateForm((prev) => ({ ...prev, title: '', description: '', dueDate: '' }))
      setCreateFieldErrors({})
      void refetchTasks()
    } catch (err) {
      setCreateError(toErrorMessage(err, TASK_STRINGS.errors.create))
    }
  }

  return {
    createTitleRef,
    createCompanyRef,
    createForm,
    setCreateForm,
    isCreateOpen,
    setIsCreateOpen,
    createFieldErrors,
    setCreateFieldErrors,
    createError,
    setCreateError,
    isCreating,
    handleCreateTask,
  }
}
