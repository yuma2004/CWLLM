import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { usePermissions } from '../hooks/usePermissions'
import {
  TASK_STATUS_OPTIONS,
  statusLabel,
  targetTypeLabel,
} from '../constants'
import { formatDate, formatDateInput } from '../utils/date'
import { getTargetPath } from '../utils/routes'
import { Task } from '../types'

function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canWrite } = usePermissions()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
  } = useFetch<{ task: Task }>(id ? `/api/tasks/${id}` : null, {
    enabled: Boolean(id),
    errorMessage: 'タスクの読み込みに失敗しました',
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

  const { data: usersData } = useFetch<{
    users: Array<{ id: string; email: string; role: string }>
  }>('/api/users/options', {
    cacheTimeMs: 30_000,
  })

  const userOptions = usersData?.users ?? []
  const task = taskData?.task ?? null

  const { mutate: updateTask, isLoading: isUpdating } = useMutation<
    { task: Task },
    { title?: string; description?: string; status?: string; dueDate?: string | null; assigneeId?: string | null }
  >('/api/tasks', 'PATCH')

  const { mutate: deleteTask, isLoading: isDeleting } = useMutation<void, void>(
    '/api/tasks',
    'DELETE'
  )

  const handleSave = async () => {
    if (!id || !canWrite) return
    setError('')
    if (!form.title.trim()) {
      setError('タイトルは必須です')
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
        { url: `/api/tasks/${id}`, errorMessage: 'タスクの更新に失敗しました' }
      )
      setIsEditing(false)
      void refetch(undefined, { ignoreCache: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの更新に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (!id || !canWrite) return
    setError('')
    try {
      await deleteTask(undefined, {
        url: `/api/tasks/${id}`,
        errorMessage: 'タスクの削除に失敗しました',
      })
      navigate('/tasks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの削除に失敗しました')
    }
  }

  const handleCancel = () => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        dueDate: task.dueDate ? formatDateInput(task.dueDate) : '',
        assigneeId: task.assigneeId || '',
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (fetchError || !task) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Link to="/tasks" className="text-sm text-slate-500 hover:text-slate-700">
          ← タスク一覧に戻る
        </Link>
        <ErrorAlert message={fetchError || 'タスクが見つかりません'} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link to="/tasks" className="hover:text-slate-700">
          タスク一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">詳細</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-slate-900">タスク詳細</h2>
        {canWrite && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              編集
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              削除
            </button>
          </div>
        )}
      </div>

      <ErrorAlert message={error} onClose={() => setError('')} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="タスクの削除"
        description={`「${task.title}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Task Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1 block text-sm font-medium text-slate-700">
                タイトル <span className="text-rose-500">*</span>
              </div>
              <FormInput
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="タスクのタイトル"
              />
            </div>
            <div>
              <div className="mb-1 block text-sm font-medium text-slate-700">説明</div>
              <FormTextarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="タスクの説明"
                className="min-h-[100px]"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="mb-1 block text-sm font-medium text-slate-700">ステータス</div>
                <FormSelect
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {TASK_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel('task', status)}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <div className="mb-1 block text-sm font-medium text-slate-700">期日</div>
                <FormInput
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div>
                <div className="mb-1 block text-sm font-medium text-slate-700">担当者</div>
                <FormSelect
                  value={form.assigneeId}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                >
                  <option value="">未割り当て</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full px-6 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isUpdating}
                className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:bg-sky-300"
              >
                {isUpdating ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                タイトル
              </dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">{task.title}</dd>
            </div>
            {task.description && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  説明
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-700">{task.description}</dd>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  ステータス
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={task.status} kind="task" />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  期日
                </dt>
                <dd className="mt-1 text-slate-700">{formatDate(task.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  担当者
                </dt>
                <dd className="mt-1 text-slate-700">{task.assignee?.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  対象
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

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールのため、タスクの編集・削除はできません。
        </div>
      )}
    </div>
  )
}

export default TaskDetail
