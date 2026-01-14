import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import LoadingState from '../components/ui/LoadingState'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import { useFetch, useMutation } from '../hooks/useApi'
import { usePagination } from '../hooks/usePagination'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../hooks/useToast'
import { apiRoutes } from '../lib/apiRoutes'
import { formatDate, formatDateInput } from '../utils/date'
import { formatCurrency } from '../utils/format'
import { ApiListResponse, Task, Wholesale } from '../types'
import { WHOLESALE_STATUS_OPTIONS, statusLabel } from '../constants'

function WholesaleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canWrite } = usePermissions()
  const { pagination, setPagination, setPage, setPageSize, paginationQuery } = usePagination(10)
  const [isEditing, setIsEditing] = useState(false)
  const [formError, setFormError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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
  } = useFetch<{ wholesale: Wholesale }>(id ? apiRoutes.wholesales.detail(id) : null, {
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
  >(apiRoutes.wholesales.base(), 'PATCH')

  const { mutate: deleteWholesale, isLoading: isDeletingWholesale } = useMutation<void, void>(
    apiRoutes.wholesales.base(),
    'DELETE'
  )

  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useFetch<ApiListResponse<Task>>(
    id ? apiRoutes.wholesales.tasks(id, paginationQuery) : null,
    {
      errorMessage: 'タスクの読み込みに失敗しました',
      onSuccess: (data) => {
        setPagination((prev) => ({ ...prev, ...data.pagination }))
      },
    }
  )

  const wholesale = wholesaleData?.wholesale
  const tasks = tasksData?.items ?? []

  const wholesaleStatus = wholesale?.status


  const buildFormState = (data: Wholesale) => ({
    status: data.status,
    unitPrice: data.unitPrice != null ? String(data.unitPrice) : '',
    margin: data.margin != null ? String(data.margin) : '',
    agreedDate: data.agreedDate ? formatDateInput(data.agreedDate) : '',
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
          url: apiRoutes.wholesales.detail(id),
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

  const handleDeleteWholesale = async () => {
    if (!id || !canWrite) return
    try {
      await deleteWholesale(undefined, {
        url: apiRoutes.wholesales.detail(id),
        errorMessage: '卸情報の削除に失敗しました',
      })
      navigate('/wholesales')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '削除に失敗しました', 'error')
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
        {wholesaleStatus && <StatusBadge status={wholesaleStatus} kind="wholesale" />}
      </div>

      {wholesaleError && <ErrorAlert message={wholesaleError} />}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">卸情報</h3>
          {canWrite && wholesale && !isEditing && (
            <div className="flex items-center gap-3">
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
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                削除
              </button>
            </div>
          )}
        </div>
        {isLoadingWholesale ? (
          <LoadingState message="卸情報を読み込み中..." />
        ) : wholesale ? (
          isEditing ? (
            <form onSubmit={handleUpdateWholesale} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 block text-xs font-medium text-slate-600">ステータス</div>
                  <FormSelect
                    className="rounded-lg"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    {WHOLESALE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel('wholesale', status)}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <div>
                  <div className="mb-1 block text-xs font-medium text-slate-600">単価</div>
                  <FormInput
                    type="number"
                    value={form.unitPrice}
                    onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <div className="mb-1 block text-xs font-medium text-slate-600">マージン (%)</div>
                  <FormInput
                    type="number"
                    step="0.1"
                    value={form.margin}
                    onChange={(event) => setForm({ ...form, margin: event.target.value })}
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <div className="mb-1 block text-xs font-medium text-slate-600">合意日</div>
                  <FormInput
                    type="date"
                    value={form.agreedDate}
                    onChange={(event) => setForm({ ...form, agreedDate: event.target.value })}
                    className="rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1 block text-xs font-medium text-slate-600">条件</div>
                  <FormTextarea
                    rows={3}
                    value={form.conditions}
                    onChange={(event) => setForm({ ...form, conditions: event.target.value })}
                    className="rounded-lg"
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
                <dd className="mt-1 text-sm text-slate-700">{statusLabel('wholesale', wholesaleStatus, '-')}</dd>
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
                {tasks.map((task) => (
                  <tr key={task.id} className="border-t border-slate-100 text-sm">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{task.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} kind="task" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(task.dueDate)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {task.assignee?.email || task.assigneeId || '-'}
                    </td>
                  </tr>
                ))}
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
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="卸情報の削除"
        description={`この卸情報を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        isLoading={isDeletingWholesale}
        onConfirm={handleDeleteWholesale}
        onCancel={() => setShowDeleteConfirm(false)}
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
