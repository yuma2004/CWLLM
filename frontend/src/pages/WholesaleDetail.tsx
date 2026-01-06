import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ErrorAlert from '../components/ui/ErrorAlert'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import { useFetch, useMutation } from '../hooks/useApi'
import { usePagination } from '../hooks/usePagination'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../hooks/useToast'
import { formatDate, formatDateInput } from '../utils/date'
import { ApiListResponse, Task, Wholesale } from '../types'
import { TASK_STATUS_LABELS, WHOLESALE_STATUS_LABELS, WHOLESALE_STATUS_OPTIONS } from '../constants'

function WholesaleDetail() {
  const { id } = useParams<{ id: string }>()
  const { canWrite } = usePermissions()
  const { pagination, setPagination, setPage, setPageSize, paginationQuery } = usePagination(10)
  const [isEditing, setIsEditing] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    status: '',
    unitPrice: '',
    margin: '',
    agreedDate: '',
    conditions: '',
  })
  const { toast, showToast, clearToast } = useToast()

  const {
    data: wholesaleData,
    setData: setWholesaleData,
    isLoading: isLoadingWholesale,
    error: wholesaleError,
  } = useFetch<{ wholesale: Wholesale }>(id ? `/api/wholesales/${id}` : null, {
    errorMessage: '卸情報の取得に失敗しました',
  })

  const { mutate: updateWholesale, isLoading: isUpdatingWholesale } = useMutation<
    { wholesale: Wholesale },
    {
      status: string
      unitPrice?: number | undefined
      margin?: number | undefined
      agreedDate?: string | null
      conditions?: string | null
    }
  >('/api/wholesales', 'PATCH')

  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useFetch<ApiListResponse<Task>>(id ? `/api/wholesales/${id}/tasks?${paginationQuery}` : null, {
    errorMessage: 'タスクの読み込みに失敗しました',
    onSuccess: (data) => {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    },
  })

  const wholesale = wholesaleData?.wholesale
  const tasks = tasksData?.items ?? []

  const statusLabel = useMemo(() => {
    if (!wholesale) return ''
    return WHOLESALE_STATUS_LABELS[wholesale.status] || wholesale.status
  }, [wholesale])

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-'
    return `¥${value.toLocaleString()}`
  }

  const buildFormState = (data: Wholesale) => ({
    status: data.status,
    unitPrice: data.unitPrice != null ? String(data.unitPrice) : '',
    margin: data.margin != null ? String(data.margin) : '',
    agreedDate: data.agreedDate ? formatDateInput(new Date(data.agreedDate)) : '',
    conditions: data.conditions ?? '',
  })

  useEffect(() => {
    if (!wholesale) return
    setForm(buildFormState(wholesale))
  }, [wholesale])

  const handleCancelEdit = () => {
    if (wholesale) {
      setForm(buildFormState(wholesale))
    }
    setFormError('')
    setIsEditing(false)
  }

  const handleUpdateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id || !wholesale) return
    setFormError('')

    if (!form.status) {
      setFormError('ステータスを選択してください')
      return
    }

    const unitPrice =
      form.unitPrice.trim() === '' ? undefined : Number(form.unitPrice)
    if (form.unitPrice.trim() !== '' && Number.isNaN(unitPrice)) {
      setFormError('単価は数値で入力してください')
      return
    }

    const margin = form.margin.trim() === '' ? undefined : Number(form.margin)
    if (form.margin.trim() !== '' && Number.isNaN(margin)) {
      setFormError('マージンは数値で入力してください')
      return
    }

    try {
      const data = await updateWholesale(
        {
          status: form.status,
          unitPrice,
          margin,
          agreedDate: form.agreedDate ? form.agreedDate : null,
          conditions: form.conditions.trim() || null,
        },
        {
          url: `/api/wholesales/${id}`,
          errorMessage: '更新に失敗しました',
        }
      )
      if (data?.wholesale) {
        setWholesaleData({ wholesale: data.wholesale })
      }
      setIsEditing(false)
      showToast('卸情報を更新しました', 'success')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '更新に失敗しました')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/wholesales" className="hover:text-slate-700">
          卸管理
        </Link>
        <span>/</span>
        <span>詳細</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Wholesale Detail</p>
          <h2 className="text-3xl font-bold text-slate-900">卸詳細</h2>
        </div>
        {statusLabel && <StatusBadge status={statusLabel} />}
      </div>

      {wholesaleError && <ErrorAlert message={wholesaleError} />}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">卸情報</h3>
          {canWrite && wholesale && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setFormError('')
                setIsEditing(true)
              }}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              編集
            </button>
          )}
        </div>
        {isLoadingWholesale ? (
          <div className="text-sm text-slate-500">卸情報を読み込み中...</div>
        ) : wholesale ? (
          isEditing ? (
            <form onSubmit={handleUpdateWholesale} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">ステータス</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    {WHOLESALE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {WHOLESALE_STATUS_LABELS[status] || status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">単価</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.unitPrice}
                    onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">マージン (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.margin}
                    onChange={(event) => setForm({ ...form, margin: event.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">合意日</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.agreedDate}
                    onChange={(event) => setForm({ ...form, agreedDate: event.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-600">条件</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                    value={form.conditions}
                    onChange={(event) => setForm({ ...form, conditions: event.target.value })}
                  />
                </div>
              </div>
              {formError && <ErrorAlert message={formError} />}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                  disabled={isUpdatingWholesale}
                >
                  {isUpdatingWholesale ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">卸先企業</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  <Link to={`/companies/${wholesale.companyId}`} className="hover:text-slate-700">
                    {wholesale.company?.name || wholesale.companyId}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">案件</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  <Link to={`/projects/${wholesale.projectId}`} className="hover:text-slate-900">
                    {wholesale.project?.name || wholesale.projectId}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">単価</dt>
                <dd className="mt-1 text-sm text-slate-700">{formatCurrency(wholesale.unitPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">マージン</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {wholesale.margin != null ? `${wholesale.margin}%` : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">合意日</dt>
                <dd className="mt-1 text-sm text-slate-700">{formatDate(wholesale.agreedDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">ステータス</dt>
                <dd className="mt-1 text-sm text-slate-700">{statusLabel}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">条件</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {wholesale.conditions || '-'}
                </dd>
              </div>
            </dl>
          )
        ) : (
          <div className="text-sm text-slate-500">卸情報が見つかりません。</div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">関連タスク</h3>
          <span className="text-xs text-slate-500">{pagination.total}件</span>
        </div>

        {tasksError && <ErrorAlert message={tasksError} className="mb-4" />}

        {isLoadingTasks ? (
          <SkeletonTable rows={4} columns={4} />
        ) : tasks.length === 0 ? (
          <div className="text-sm text-slate-500">関連タスクはありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-3">タイトル</th>
                  <th className="px-4 py-3">ステータス</th>
                  <th className="px-4 py-3">期日</th>
                  <th className="px-4 py-3">担当</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const taskStatus = TASK_STATUS_LABELS[task.status] || task.status
                  return (
                    <tr key={task.id} className="border-t border-slate-100 text-sm">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{task.title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={taskStatus} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(task.dueDate)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {task.assignee?.email || task.assigneeId || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant === 'error' ? 'error' : 'success'}
          onClose={clearToast}
          className="fixed bottom-6 right-6 z-50"
        />
      )}
    </div>
  )
}

export default WholesaleDetail
