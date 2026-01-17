import { useMemo, useState } from 'react'
import ErrorAlert from './ui/ErrorAlert'
import FormInput from './ui/FormInput'
import FormSelect from './ui/FormSelect'
import FormTextarea from './ui/FormTextarea'
import LoadingState from './ui/LoadingState'
import StatusBadge from './ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { apiRoutes } from '../lib/apiRoutes'
import { formatDate } from '../utils/date'
import { toErrorMessage } from '../utils/errorState'
import { ApiListResponse, Task } from '../types'
import { TASK_STATUS_OPTIONS, statusLabel } from '../constants/labels'

function CompanyTasksSection({ companyId, canWrite }: { companyId: string; canWrite: boolean }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' })
  const [formError, setFormError] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('pageSize', '20')
    if (statusFilter) params.set('status', statusFilter)
    return params.toString()
  }, [statusFilter])

  const {
    data: tasksData,
    isLoading,
    refetch: refetchTasks,
  } = useFetch<ApiListResponse<Task>>(
    apiRoutes.companies.tasks(companyId, queryString),
    {
      errorMessage: 'タスクの読み込みに失敗しました',
      onStart: () => setError(''),
      onError: setError,
    }
  )

  const { mutate: createTask } = useMutation<Task, {
    targetType: string
    targetId: string
    title: string
    description?: string
    dueDate?: string
  }>(apiRoutes.tasks.base(), 'POST')

  const { mutate: updateTask } = useMutation<Task, { status: string }>(
    apiRoutes.tasks.base(),
    'PATCH'
  )

  const tasks = tasksData?.items ?? []

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!form.title.trim()) {
      setFormError('タイトルは必須です')
      return
    }

    try {
      await createTask(
        {
          targetType: 'company',
          targetId: companyId,
          title: form.title.trim(),
          description: form.description || undefined,
          dueDate: form.dueDate || undefined,
        },
        { errorMessage: 'タスクの作成に失敗しました' }
      )
      setForm({ title: '', description: '', dueDate: '' })
      void refetchTasks()
    } catch (err) {
      setFormError(toErrorMessage(err, 'ネットワークエラー'))
    }
  }

  const handleStatusChange = async (taskId: string, nextStatus: string) => {
    try {
      await updateTask(
        { status: nextStatus },
        { url: apiRoutes.tasks.detail(taskId), errorMessage: 'タスクの更新に失敗しました' }
      )
      void refetchTasks()
    } catch (err) {
      setError(toErrorMessage(err, 'ネットワークエラー'))
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">タスク</h3>
        <FormSelect
          className="w-auto px-3 py-1 text-xs"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">全てのステータス</option>
          {TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel('task', status)}
            </option>
          ))}
        </FormSelect>
      </div>

      <ErrorAlert message={error} className="mt-3" onClose={() => setError('')} />

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <LoadingState message="タスクを読み込み中..." />
        ) : tasks.length === 0 ? (
          <div className="text-sm text-slate-500">タスクはまだありません</div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
            >
              <div>
                <div className="font-semibold text-slate-900">{task.title}</div>
                {task.description && (
                  <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {task.description}
                  </div>
                )}
                <div className="mt-1 text-xs text-slate-400">
                  期日: {formatDate(task.dueDate)}
                </div>
              </div>
              {canWrite ? (
                <FormSelect
                  className="w-auto rounded-full px-3 py-1 text-xs"
                  containerClassName="w-auto"
                  value={task.status}
                  onChange={(event) => handleStatusChange(task.id, event.target.value)}
                >
                  {TASK_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel('task', status)}
                    </option>
                  ))}
                </FormSelect>
              ) : (
                <StatusBadge status={task.status} kind="task" size="sm" />
              )}
            </div>
          ))
        )}
      </div>

      {canWrite ? (
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <FormInput
              placeholder="タスクタイトル"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <FormInput
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </div>
          <FormTextarea
            rows={3}
            placeholder="メモ・備考"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <ErrorAlert message={formError} onClose={() => setFormError('')} />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white  hover:bg-slate-800"
            >
              タスクを追加
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 text-sm text-slate-500">書き込み権限がありません</div>
      )}
    </div>
  )
}

export default CompanyTasksSection
