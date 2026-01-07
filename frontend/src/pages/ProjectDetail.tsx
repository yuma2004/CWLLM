import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CompanySearchSelect from '../components/CompanySearchSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { usePermissions } from '../hooks/usePermissions'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_OPTIONS, WHOLESALE_STATUS_LABELS } from '../constants'
import { formatDate, formatDateInput } from '../utils/date'
import { Project, User, Wholesale } from '../types'

type ProjectUpdatePayload = {
  name?: string
  status?: string
  unitPrice?: number | null
  conditions?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  ownerId?: string | null
}

function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { canWrite } = usePermissions()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({
    companyId: '',
    status: 'active',
    unitPrice: '',
    taxType: 'excluded' as 'excluded' | 'included',
    conditions: '',
    agreedDate: '',
  })
  const [formError, setFormError] = useState('')

  // 案件編集用state
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState({
    name: '',
    status: 'active',
    unitPrice: '',
    conditions: '',
    periodStart: '',
    periodEnd: '',
    ownerId: '',
  })
  const [projectFormError, setProjectFormError] = useState('')

  // 編集モーダル用state
  const [editingWholesale, setEditingWholesale] = useState<Wholesale | null>(null)
  const [editForm, setEditForm] = useState({
    status: 'active',
    unitPrice: '',
    taxType: 'excluded' as 'excluded' | 'included',
    conditions: '',
    agreedDate: '',
  })
  const [editError, setEditError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Wholesale | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const {
    data: projectData,
    error: projectError,
    isLoading: isLoadingProject,
    refetch: refetchProject,
  } = useFetch<{ project: Project }>(id ? `/api/projects/${id}` : null, {
    enabled: Boolean(id),
    errorMessage: 'ネットワークエラー',
    cacheTimeMs: 10_000,
  })

  const {
    data: wholesalesData,
    error: wholesalesError,
    isLoading: isLoadingWholesales,
    refetch: refetchWholesales,
  } = useFetch<{ wholesales: Wholesale[] }>(
    id ? `/api/projects/${id}/wholesales` : null,
    {
      enabled: Boolean(id),
      errorMessage: 'ネットワークエラー',
      cacheTimeMs: 10_000,
    }
  )

  const project = projectData?.project ?? null
  const wholesales = wholesalesData?.wholesales ?? []
  const isLoading = isLoadingProject || isLoadingWholesales
  const error = projectError || wholesalesError

  const refreshData = useMemo(
    () => () => {
      void refetchProject(undefined, { ignoreCache: true })
      void refetchWholesales(undefined, { ignoreCache: true })
    },
    [refetchProject, refetchWholesales]
  )

  // 案件データが読み込まれたらフォームを初期化
  useEffect(() => {
    if (project) {
      setProjectForm({
        name: project.name,
        status: project.status || 'active',
        unitPrice: project.unitPrice?.toString() || '',
        conditions: project.conditions || '',
        periodStart: project.periodStart ? formatDateInput(new Date(project.periodStart)) : '',
        periodEnd: project.periodEnd ? formatDateInput(new Date(project.periodEnd)) : '',
        ownerId: project.ownerId || '',
      })
    }
  }, [project])

  const { mutate: createWholesale, isLoading: isCreatingWholesale } = useMutation<
    { wholesale: Wholesale },
    {
      projectId: string
      companyId: string
      status: string
      unitPrice?: number
      conditions?: string
      agreedDate?: string
    }
  >('/api/wholesales', 'POST')

  const { mutate: updateWholesale } = useMutation<
    { wholesale: Wholesale },
    {
      status: string
      unitPrice?: number | null
      conditions?: string | null
      agreedDate?: string | null
    }
  >('/api/wholesales', 'PATCH')

  const { mutate: removeWholesale, isLoading: isDeletingWholesale } = useMutation<
    unknown,
    void
  >('/api/wholesales', 'DELETE')

  const { mutate: updateProject, isLoading: isUpdatingProject } = useMutation<
    { project: Project },
    ProjectUpdatePayload
  >('/api/projects', 'PATCH')

  const { data: usersData } = useFetch<{ users: User[] }>('/api/users', {
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []

  const handleCancelProjectEdit = () => {
    if (project) {
      setProjectForm({
        name: project.name,
        status: project.status || 'active',
        unitPrice: project.unitPrice?.toString() || '',
        conditions: project.conditions || '',
        periodStart: project.periodStart ? formatDateInput(new Date(project.periodStart)) : '',
        periodEnd: project.periodEnd ? formatDateInput(new Date(project.periodEnd)) : '',
        ownerId: project.ownerId || '',
      })
    }
    setProjectFormError('')
    setIsEditingProject(false)
  }

  const handleUpdateProject = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setProjectFormError('')

    if (!projectForm.name.trim()) {
      setProjectFormError('案件名は必須です')
      return
    }

    try {
      const payload: ProjectUpdatePayload = {
        name: projectForm.name.trim(),
        status: projectForm.status || undefined,
        unitPrice: projectForm.unitPrice ? Number(projectForm.unitPrice) : null,
        conditions: projectForm.conditions.trim() || null,
        periodStart: projectForm.periodStart || null,
        periodEnd: projectForm.periodEnd || null,
        ownerId: projectForm.ownerId || null,
      }

      await updateProject(payload, {
        url: `/api/projects/${id}`,
        errorMessage: '案件の更新に失敗しました',
      })
      setIsEditingProject(false)
      refreshData()
    } catch (err) {
      setProjectFormError(err instanceof Error ? err.message : '案件の更新に失敗しました')
    }
  }

  const handleCreateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setFormError('')
    if (!form.companyId) {
      setFormError('卸先企業を選択してください')
      return
    }

    try {
      await createWholesale(
        {
          projectId: id,
          companyId: form.companyId,
          status: form.status,
          unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
          conditions: form.conditions || undefined,
          agreedDate: form.agreedDate || undefined,
        },
        { errorMessage: 'ネットワークエラー' }
      )
      setForm({ companyId: '', status: 'active', unitPrice: '', taxType: 'excluded', conditions: '', agreedDate: '' })
      setShowCreateForm(false)
      refreshData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  const openEditModal = (wholesale: Wholesale) => {
    setEditingWholesale(wholesale)
    setEditForm({
      status: wholesale.status,
      unitPrice: wholesale.unitPrice?.toString() || '',
      taxType: 'excluded', // 既存データには税種別がないため、デフォルトで税抜とする
      conditions: wholesale.conditions || '',
      agreedDate: wholesale.agreedDate ? wholesale.agreedDate.split('T')[0] : '',
    })
    setEditError('')
  }

  const handleUpdateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingWholesale) return
    setEditError('')

    try {
      await updateWholesale(
        {
          status: editForm.status,
          unitPrice: editForm.unitPrice ? parseFloat(editForm.unitPrice) : null,
          conditions: editForm.conditions || null,
          agreedDate: editForm.agreedDate || null,
        },
        {
          url: `/api/wholesales/${editingWholesale.id}`,
          errorMessage: 'ネットワークエラー',
        }
      )
      setEditingWholesale(null)
      refreshData()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  const handleDeleteWholesale = (wholesale: Wholesale) => {
    setDeleteError('')
    setDeleteTarget(wholesale)
  }

  const confirmDeleteWholesale = async () => {
    if (!deleteTarget) return
    setDeleteError('')

    try {
      await removeWholesale(undefined, {
        url: `/api/wholesales/${deleteTarget.id}`,
        errorMessage: 'ネットワークエラー',
      })
      setDeleteTarget(null)
      refreshData()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-'
    return `¥${value.toLocaleString()}`
  }

  if (isLoading) {
    return <div className="text-slate-500">読み込み中...</div>
  }

  if (error) {
    return <ErrorAlert message={error} />
  }

  if (!project) {
    return <div className="text-slate-500">案件が見つかりません。</div>
  }
  const projectStatus = project.status ?? ''

  return (
    <div className="space-y-6 animate-fade-up">
      <nav className="text-xs text-slate-400">
        <Link to="/projects" className="hover:text-slate-600">
          案件一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-500">{project.name}</span>
      </nav>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">案件詳細</p>
          <h2 className="text-3xl font-bold text-slate-900">{project.name}</h2>
        </div>
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-700">
          一覧に戻る
        </Link>
      </div>

      {deleteError && <ErrorAlert message={deleteError} />}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">案件情報</h3>
          {canWrite && !isEditingProject && (
            <button
              type="button"
              onClick={() => setIsEditingProject(true)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              編集
            </button>
          )}
        </div>

        {isEditingProject ? (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  案件名 <span className="text-rose-500">*</span>
                </label>
                <FormInput
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="案件名を入力"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">ステータス</label>
                <FormSelect
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                >
                  {PROJECT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {PROJECT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">単価</label>
                <FormInput
                  type="number"
                  value={projectForm.unitPrice}
                  onChange={(e) => setProjectForm({ ...projectForm, unitPrice: e.target.value })}
                  placeholder="例: 50000"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">担当者</label>
                <FormSelect
                  value={projectForm.ownerId}
                  onChange={(e) => setProjectForm({ ...projectForm, ownerId: e.target.value })}
                >
                  <option value="">未設定</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">期間開始</label>
                <FormInput
                  type="date"
                  value={projectForm.periodStart}
                  onChange={(e) => setProjectForm({ ...projectForm, periodStart: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">期間終了</label>
                <FormInput
                  type="date"
                  value={projectForm.periodEnd}
                  onChange={(e) => setProjectForm({ ...projectForm, periodEnd: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">条件・備考</label>
                <FormTextarea
                  value={projectForm.conditions}
                  onChange={(e) => setProjectForm({ ...projectForm, conditions: e.target.value })}
                  placeholder="条件や備考を入力"
                  className="min-h-[80px]"
                />
              </div>
            </div>
            {projectFormError && (
              <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {projectFormError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelProjectEdit}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:bg-sky-300"
                disabled={isUpdatingProject}
              >
                {isUpdatingProject ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">ステータス</dt>
              <dd className="mt-1">
                <StatusBadge
                  status={PROJECT_STATUS_LABELS[projectStatus] || project.status || '-'}
                />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">企業</dt>
              <dd className="mt-1 text-slate-800">
                <Link to={`/companies/${project.companyId}`} className="text-sky-600 hover:text-sky-700 hover:underline">
                  {project.company?.name || project.companyId}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">単価</dt>
              <dd className="mt-1 text-slate-800">{formatCurrency(project.unitPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">担当者</dt>
              <dd className="mt-1 text-slate-800">{project.owner?.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">期間</dt>
              <dd className="mt-1 text-slate-800">
                {project.periodStart || project.periodEnd
                  ? `${formatDate(project.periodStart)} 〜 ${formatDate(project.periodEnd)}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">条件</dt>
              <dd className="mt-1 text-slate-800 whitespace-pre-wrap">{project.conditions || '-'}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* 卸先一覧 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">卸先一覧</h3>
            <p className="text-xs text-slate-400 mt-1">{wholesales.length}件</p>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              {showCreateForm ? 'キャンセル' : '+ 卸先を追加'}
            </button>
          )}
        </div>

        {/* 追加フォーム */}
        {showCreateForm && canWrite && (
          <form onSubmit={handleCreateWholesale} className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">卸先企業 *</label>
                <CompanySearchSelect
                  value={form.companyId}
                  onChange={(companyId) => setForm({ ...form, companyId })}
                  placeholder="企業名で検索"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">有効</option>
                  <option value="paused">停止中</option>
                  <option value="closed">終了</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">単価</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="例: 10000"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  />
                  <select
                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={form.taxType}
                    onChange={(e) => setForm({ ...form, taxType: e.target.value as 'excluded' | 'included' })}
                  >
                    <option value="excluded">税抜</option>
                    <option value="included">税込</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">合意日</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.agreedDate}
                  onChange={(e) => setForm({ ...form, agreedDate: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">条件・備考</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="条件や備考を入力"
                  value={form.conditions}
                  onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                />
              </div>
            </div>
            {formError && (
              <div className="mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {formError}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
                disabled={isCreatingWholesale}
              >
                {isCreatingWholesale ? '追加中...' : '追加'}
              </button>
            </div>
          </form>
        )}

        {/* 卸一覧テーブル */}
        <div className="mt-4 overflow-x-auto">
          {wholesales.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">卸先がありません</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">卸先企業</th>
                  <th className="px-4 py-3 font-medium">ステータス</th>
                  <th className="px-4 py-3 font-medium text-right">単価</th>
                  <th className="px-4 py-3 font-medium">合意日</th>
                  <th className="px-4 py-3 font-medium">条件</th>
                  {canWrite && <th className="px-4 py-3 font-medium text-right">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wholesales.map((wholesale) => (
                  <tr key={wholesale.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/companies/${wholesale.companyId}`}
                        className="font-medium text-slate-900 hover:text-sky-600"
                      >
                        {wholesale.company?.name || wholesale.companyId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={WHOLESALE_STATUS_LABELS[wholesale.status] || wholesale.status}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(wholesale.unitPrice)}</td>
                    <td className="px-4 py-3">{formatDate(wholesale.agreedDate)}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={wholesale.conditions || undefined}>
                      {wholesale.conditions || '-'}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(wholesale)}
                          className="text-xs font-medium text-sky-600 hover:text-sky-700 mr-3"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteWholesale(wholesale)}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          削除
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 編集モーダル */}
      {editingWholesale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingWholesale(null)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">卸情報を編集</h3>
            <form onSubmit={handleUpdateWholesale}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">卸先企業</label>
                  <div className="text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
                    {editingWholesale.company?.name || editingWholesale.companyId}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">有効</option>
                    <option value="paused">停止中</option>
                    <option value="closed">終了</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">単価</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={editForm.unitPrice}
                      onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                    />
                    <select
                      className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={editForm.taxType}
                      onChange={(e) => setEditForm({ ...editForm, taxType: e.target.value as 'excluded' | 'included' })}
                    >
                      <option value="excluded">税抜</option>
                      <option value="included">税込</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">合意日</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={editForm.agreedDate}
                    onChange={(e) => setEditForm({ ...editForm, agreedDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">条件・備考</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                    value={editForm.conditions}
                    onChange={(e) => setEditForm({ ...editForm, conditions: e.target.value })}
                  />
                </div>
              </div>
              {editError && (
                <div className="mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {editError}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingWholesale(null)}
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          卸先の追加・編集には書き込み権限が必要です
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="卸情報の削除"
        description={deleteTarget ? `${deleteTarget.company?.name || deleteTarget.companyId} の卸情報を削除します。` : undefined}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        isLoading={isDeletingWholesale}
        onConfirm={confirmDeleteWholesale}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ProjectDetail
