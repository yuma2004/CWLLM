import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import DateInput from '../components/ui/DateInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../hooks/useToast'
import Toast from '../components/ui/Toast'
import { apiRoutes } from '../lib/apiRoutes'
import {
  TASK_STATUS_OPTIONS,
  statusLabel,
  targetTypeLabel,
} from '../constants/labels'
import { formatDate, formatDateInput } from '../utils/date'
import { getTargetPath } from '../utils/routes'
import type { Task, User } from '../types'
import { TASK_STRINGS } from '../strings/tasks'

function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canWrite } = usePermissions()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { toast, showToast, clearToast } = useToast()

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: '',
    dueDate: '',
    assigneeId: '',
  })

  const {
    data: taskData,
    error: fetchError,
    isLoading,
    refetch,
  } = useFetch<{ task: Task }>(id ? apiRoutes.tasks.detail(id) : null, {
    enabled: Boolean(id),
    authMode: 'bearer',
    errorMessage: TASK_STRINGS.errors.load,
    onSuccess: (data) => {
      if (data.task) {
        setForm({
          title: data.task.title,
          description: data.task.description || '',
          status: data.task.status,
          dueDate: data.task.dueDate ? formatDateInput(data.task.dueDate) : '',
          assigneeId: data.task.assigneeId || '',
        })
      }
    },
  })

  const task = taskData?.task ?? null

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.options(), {
    authMode: 'bearer',
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []

  const { mutate: updateTask, isLoading: isUpdating } = useMutation<
    { task: Task },
    { title?: string; description?: string; status?: string; dueDate?: string | null; assigneeId?: string | null }
  >(apiRoutes.tasks.base(), 'PATCH')

  const { mutate: deleteTask, isLoading: isDeleting } = useMutation<void, void>(
    apiRoutes.tasks.base(),
    'DELETE'
  )

  const resetForm = (source: Task) => {
    setForm({
      title: source.title,
      description: source.description || '',
      status: source.status,
      dueDate: source.dueDate ? formatDateInput(source.dueDate) : '',
      assigneeId: source.assigneeId || '',
    })
  }

  const handleCancel = () => {
    if (!task) return
    resetForm(task)
    setIsEditing(false)
    setError('')
  }

  const handleSave = async () => {
    if (!id || !canWrite) return
    setError('')
    if (!form.title.trim()) {
      setError(TASK_STRINGS.errors.titleRequired)
      return
    }
    try {
      await updateTask(
        {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
          dueDate: form.dueDate || null,
          assigneeId: form.assigneeId || null,
        },
        {
          authMode: 'bearer',
          url: apiRoutes.tasks.detail(id),
          errorMessage: TASK_STRINGS.errors.update,
        }
      )
      setIsEditing(false)
      void refetch(undefined, { ignoreCache: true })
      showToast(TASK_STRINGS.success.update, 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : TASK_STRINGS.errors.update)
    }
  }

  const handleDelete = async () => {
    if (!id || !canWrite) return
    setError('')
    try {
      await deleteTask(undefined, {
        authMode: 'bearer',
        url: apiRoutes.tasks.detail(id),
        errorMessage: TASK_STRINGS.errors.delete,
      })
      showToast(TASK_STRINGS.success.delete, 'success')
      navigate('/tasks')
    } catch (err) {
      setError(err instanceof Error ? err.message : TASK_STRINGS.errors.delete)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="mt-4 h-20 rounded bg-slate-50" />
        </div>
      </div>
    )
  }

  if (fetchError) {
    return <ErrorAlert message={fetchError} />
  }

  if (!task) {
    return <div className="text-slate-500">{TASK_STRINGS.messages.notFound}</div>
  }

  return (
    <div className="space-y-4">
      <nav className="text-xs text-slate-400">
        <Link to="/tasks" className="hover:text-slate-600">
          {TASK_STRINGS.labels.section}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-500">{task.title}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-400">{TASK_STRINGS.labels.section}</p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{task.title}</h2>
            <StatusBadge status={task.status} kind="task" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/tasks"
            className="rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            {TASK_STRINGS.actions.backToList}
          </Link>
          {canWrite && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => {
                  resetForm(task)
                  setIsEditing(true)
                }}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {TASK_STRINGS.actions.edit}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:border-rose-300"
              >
                {TASK_STRINGS.confirm.deleteConfirmLabel}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">{TASK_STRINGS.labels.status}</div>
          <div className="mt-1">
            <StatusBadge status={task.status} kind="task" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">{TASK_STRINGS.labels.dueDate}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {formatDate(task.dueDate)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">{TASK_STRINGS.labels.assignee}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {task.assignee?.name || task.assignee?.email || task.assigneeId || TASK_STRINGS.labels.unassigned}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-500">{TASK_STRINGS.labels.target}</div>
          <Link
            to={getTargetPath(task.targetType, task.targetId)}
            className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600">
              {targetTypeLabel(task.targetType)}
            </span>
            <span className="truncate">{task.target?.name || task.targetId}</span>
          </Link>
        </div>
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={TASK_STRINGS.confirm.deleteTitle}
        description={TASK_STRINGS.confirm.deleteDescription(task.title)}
        confirmLabel={TASK_STRINGS.confirm.deleteConfirmLabel}
        cancelLabel={TASK_STRINGS.confirm.cancelLabel}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1 block text-sm font-medium text-slate-700">
                {TASK_STRINGS.labels.title} <span className="text-rose-500">*</span>
              </div>
              <FormInput
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={TASK_STRINGS.labels.titlePlaceholder}
              />
            </div>
            <div>
              <div className="mb-1 block text-sm font-medium text-slate-700">
                {TASK_STRINGS.labels.description}
              </div>
              <FormTextarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={TASK_STRINGS.labels.descriptionPlaceholder}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 block text-sm font-medium text-slate-700">
                  {TASK_STRINGS.labels.status}
                </div>
                <FormSelect
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {TASK_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel('task', s)}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <div className="mb-1 block text-sm font-medium text-slate-700">
                  {TASK_STRINGS.labels.assignee}
                </div>
                <FormSelect
                  value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                >
                  <option value="">{TASK_STRINGS.labels.unassigned}</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <div className="mb-1 block text-sm font-medium text-slate-700">
                  {TASK_STRINGS.labels.dueDate}
                </div>
                <DateInput
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full px-6 py-2 text-sm font-semibold text-slate-600  hover:bg-slate-100"
              >
                {TASK_STRINGS.confirm.cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isUpdating}
                className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white  hover:bg-sky-700 disabled:bg-sky-300"
              >
                {isUpdating ? TASK_STRINGS.actions.saving : TASK_STRINGS.actions.save}
              </button>
            </div>
          </div>
        ) : (
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">
                {TASK_STRINGS.labels.title}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{task.title}</dd>
            </div>
            {task.description && (
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  {TASK_STRINGS.labels.description}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-700">{task.description}</dd>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  {TASK_STRINGS.labels.status}
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={task.status} kind="task" />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  {TASK_STRINGS.labels.assignee}
                </dt>
                <dd className="mt-1 text-slate-700">
                  {task.assignee?.name || task.assignee?.email || task.assigneeId || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  {TASK_STRINGS.labels.dueDate}
                </dt>
                <dd className="mt-1 text-slate-700">{formatDate(task.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-slate-500">
                  {TASK_STRINGS.labels.target}
                </dt>
                <dd className="mt-1">
                  <Link
                    to={getTargetPath(task.targetType, task.targetId)}
                    className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700"
                  >
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {targetTypeLabel(task.targetType)}
                    </span>
                    <span>{task.target?.name || task.targetId}</span>
                  </Link>
                </dd>
              </div>
            </div>
          </dl>
        )}
      </div>

      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          {TASK_STRINGS.notices.readonlyDetail}
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant === 'error' ? 'error' : toast.variant === 'success' ? 'success' : 'info'}
          onClose={clearToast}
          className="fixed bottom-6 right-6 z-50 safe-area-bottom"
        />
      )}
    </div>
  )
}

export default TaskDetail
