import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CompanySearchSelect } from '../components/SearchSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import LoadingState from '../components/ui/LoadingState'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import DateInput from '../components/ui/DateInput'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../hooks/useToast'
import Toast from '../components/ui/Toast'
import { apiRoutes } from '../lib/apiRoutes'
import { PROJECT_STATUS_OPTIONS, statusLabel } from '../constants/labels'
import { formatDate, formatDateInput } from '../utils/date'
import { formatCurrency } from '../utils/format'
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
    conditions: '',
    agreedDate: '',
  })
  const [formError, setFormError] = useState('')

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

  const [editingWholesale, setEditingWholesale] = useState<Wholesale | null>(null)
  const [editForm, setEditForm] = useState({
    status: 'active',
    unitPrice: '',
    conditions: '',
    agreedDate: '',
  })
  const [editError, setEditError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Wholesale | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const { toast, showToast, clearToast } = useToast()

  const {
    data: projectData,
    error: projectError,
    isLoading: isLoadingProject,
    refetch: refetchProject,
  } = useFetch<{ project: Project }>(id ? apiRoutes.projects.detail(id) : null, {
    enabled: Boolean(id),
    cacheTimeMs: 10_000,
  })

  const {
    data: wholesalesData,
    error: wholesalesError,
    isLoading: isLoadingWholesales,
    refetch: refetchWholesales,
  } = useFetch<{ wholesales: Wholesale[] }>(id ? apiRoutes.projects.wholesales(id) : null, {
    enabled: Boolean(id),
    cacheTimeMs: 10_000,
  })

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

  useEffect(() => {
    if (project) {
      setProjectForm({
        name: project.name,
        status: project.status || 'active',
        unitPrice: project.unitPrice?.toString() || '',
        conditions: project.conditions || '',
        periodStart: project.periodStart ? formatDateInput(project.periodStart) : '',
        periodEnd: project.periodEnd ? formatDateInput(project.periodEnd) : '',
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
  >(apiRoutes.wholesales.base(), 'POST')

  const { mutate: updateWholesale } = useMutation<
    { wholesale: Wholesale },
    {
      status: string
      unitPrice?: number | null
      conditions?: string | null
      agreedDate?: string | null
    }
  >(apiRoutes.wholesales.base(), 'PATCH')

  const { mutate: removeWholesale, isLoading: isDeletingWholesale } = useMutation<
    unknown,
    void
  >(apiRoutes.wholesales.base(), 'DELETE')

  const { mutate: updateProject, isLoading: isUpdatingProject } = useMutation<
    { project: Project },
    ProjectUpdatePayload
  >(apiRoutes.projects.base(), 'PATCH')

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.options(), {
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []
  const ownerLabel = project
    ? userOptions.find((user) => user.id === project.ownerId)?.name ||
      userOptions.find((user) => user.id === project.ownerId)?.email ||
      project.owner?.name ||
      project.owner?.email ||
      project.ownerId ||
      '-'
    : '-'

  const handleCancelProjectEdit = () => {
    if (project) {
      setProjectForm({
        name: project.name,
        status: project.status || 'active',
        unitPrice: project.unitPrice?.toString() || '',
        conditions: project.conditions || '',
        periodStart: project.periodStart ? formatDateInput(project.periodStart) : '',
        periodEnd: project.periodEnd ? formatDateInput(project.periodEnd) : '',
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
      setProjectFormError('案件名を入力してください。')
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
        url: apiRoutes.projects.detail(id),
        errorMessage: '案件の更新に失敗しました。',
      })
      setIsEditingProject(false)
      refreshData()
      showToast('案件を更新しました。', 'success')
    } catch (err) {
      setProjectFormError(err instanceof Error ? err.message : '案件の更新に失敗しました。')
    }
  }

  const handleCreateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setFormError('')
    if (!form.companyId) {
      setFormError('企業を選択してください。')
      return
    }

    try {
      await createWholesale({
        projectId: id,
        companyId: form.companyId,
        status: form.status,
        unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
        conditions: form.conditions || undefined,
        agreedDate: form.agreedDate || undefined,
      })
      setForm({
        companyId: '',
        status: 'active',
        unitPrice: '',
        conditions: '',
        agreedDate: '',
      })
      setShowCreateForm(false)
      refreshData()
      showToast('卸を追加しました。', 'success')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '卸の作成に失敗しました。')
    }
  }

  const openEditModal = (wholesale: Wholesale) => {
    setEditingWholesale(wholesale)
    setEditForm({
      status: wholesale.status,
      unitPrice: wholesale.unitPrice?.toString() || '',
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
          url: apiRoutes.wholesales.detail(editingWholesale.id),
        }
      )
      setEditingWholesale(null)
      refreshData()
      showToast('卸を更新しました。', 'success')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '卸の更新に失敗しました。')
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
        url: apiRoutes.wholesales.detail(deleteTarget.id),
      })
      setDeleteTarget(null)
      refreshData()
      showToast('卸を削除しました。', 'success')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '卸の削除に失敗しました。')
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorAlert message={error} />
  }

  if (!project) {
    return <div className="text-slate-500">案件が見つかりません。</div>
  }

  return (
    <div className="space-y-4">
      <nav className="text-xs text-slate-400">
        <Link to="/projects" className="hover:text-slate-600">
          案件一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-500">{project.name}</span>
      </nav>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">案件詳細</p>
          <h2 className="text-3xl font-bold text-slate-900">{project.name}</h2>
        </div>
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-700">
          一覧に戻る
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">ステータス</div>
          <div className="mt-1">
            <StatusBadge status={project.status ?? '-'} kind="project" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">企業</div>
          <Link
            to={`/companies/${project.companyId}`}
            className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            {project.company?.name || project.companyId}
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">担当者</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{ownerLabel}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">期間</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {project.periodStart || project.periodEnd
              ? `${formatDate(project.periodStart)} ? ${formatDate(project.periodEnd)}`
              : '-'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">単価</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {formatCurrency(project.unitPrice)}
          </div>
        </div>
      </div>

      {deleteError && <ErrorAlert message={deleteError} />}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">案件情報</h3>
          {canWrite && !isEditingProject && (
            <Button
              type="button"
              onClick={() => setIsEditingProject(true)}
              variant="ghost"
              size="sm"
              className="text-sky-600 hover:text-sky-700"
            >
              編集
            </Button>
          )}
        </div>

        {isEditingProject ? (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">
                  案件名 <span className="text-rose-500">*</span>
                </div>
                <FormInput
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="案件名を入力"
                />
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">ステータス</div>
                <FormSelect
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                >
                  {PROJECT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel('project', status)}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">単価</div>
                <FormInput
                  type="number"
                  value={projectForm.unitPrice}
                  onChange={(e) => setProjectForm({ ...projectForm, unitPrice: e.target.value })}
                  placeholder="例: 50000"
                />
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">担当者</div>
                <FormSelect
                  value={projectForm.ownerId}
                  onChange={(e) => setProjectForm({ ...projectForm, ownerId: e.target.value })}
                >
                  <option value="">担当者未設定</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">開始日</div>
                <DateInput
                  value={projectForm.periodStart}
                  onChange={(e) => setProjectForm({ ...projectForm, periodStart: e.target.value })}
                />
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">終了日</div>
                <DateInput
                  value={projectForm.periodEnd}
                  onChange={(e) => setProjectForm({ ...projectForm, periodEnd: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 block text-xs font-medium text-slate-600">条件・メモ</div>
                <FormTextarea
                  value={projectForm.conditions}
                  onChange={(e) => setProjectForm({ ...projectForm, conditions: e.target.value })}
                  placeholder="条件や補足を入力"
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
              <Button type="button" onClick={handleCancelProjectEdit} variant="secondary" size="sm">
                キャンセル
              </Button>
              <Button type="submit" size="sm" isLoading={isUpdatingProject} loadingLabel="保存中...">
                保存
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-400">ステータス</dt>
              <dd className="mt-1">
                <StatusBadge status={project.status ?? '-'} kind="project" />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">企業</dt>
              <dd className="mt-1 text-slate-800">
                <Link to={`/companies/${project.companyId}`} className="text-sky-600 hover:text-sky-700 hover:underline">
                  {project.company?.name || project.companyId}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">単価</dt>
              <dd className="mt-1 text-slate-800">{formatCurrency(project.unitPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">担当者</dt>
              <dd className="mt-1 text-slate-800">{ownerLabel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">期間</dt>
              <dd className="mt-1 text-slate-800">
                {project.periodStart || project.periodEnd
                  ? `${formatDate(project.periodStart)} ? ${formatDate(project.periodEnd)}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">条件</dt>
              <dd className="mt-1 text-slate-800 whitespace-pre-wrap">{project.conditions || '-'}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">卸一覧</h3>
            <p className="text-xs text-slate-400 mt-1">{wholesales.length} 件</p>
          </div>
          {canWrite && (
            <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
              {showCreateForm ? 'キャンセル' : '卸を追加'}
            </Button>
          )}
        </div>

        {showCreateForm && canWrite && (
          <form
            onSubmit={handleCreateWholesale}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">企業 *</div>
                <CompanySearchSelect
                  value={form.companyId}
                  onChange={(companyId) => setForm({ ...form, companyId })}
                  placeholder="企業名で検索"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">ステータス</div>
                <FormSelect
                  className="rounded-lg"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">稼働中</option>
                  <option value="paused">一時停止</option>
                  <option value="closed">終了</option>
                </FormSelect>
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">単価</div>
                <FormInput
                  type="number"
                  placeholder="例: 10000"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  containerClassName="flex-1"
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">成立日</div>
                <DateInput
                  value={form.agreedDate}
                  onChange={(e) => setForm({ ...form, agreedDate: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <div className="block text-xs font-medium text-slate-600 mb-1">条件・メモ</div>
                <FormInput
                  type="text"
                  placeholder="条件や補足を入力"
                  value={form.conditions}
                  onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>
            {formError && (
              <div className="mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {formError}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button type="submit" size="sm" isLoading={isCreatingWholesale} loadingLabel="作成中...">
                追加
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-x-auto">
          {wholesales.length === 0 ? (
            <EmptyState className="py-8" message="卸がありません" />
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">企業</th>
                  <th className="px-4 py-3 font-medium">ステータス</th>
                  <th className="px-4 py-3 font-medium text-right">単価</th>
                  <th className="px-4 py-3 font-medium">成立日</th>
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
                      <StatusBadge status={wholesale.status} kind="wholesale" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(wholesale.unitPrice)}</td>
                    <td className="px-4 py-3">{formatDate(wholesale.agreedDate)}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={wholesale.conditions || undefined}>
                      {wholesale.conditions || '-'}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          onClick={() => openEditModal(wholesale)}
                          variant="ghost"
                          size="sm"
                          className="text-sky-600 hover:text-sky-700 mr-2"
                        >
                          編集
                        </Button>
                        <Button
                          onClick={() => handleDeleteWholesale(wholesale)}
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                        >
                          削除
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        isOpen={Boolean(editingWholesale)}
        onClose={() => setEditingWholesale(null)}
        title="卸の編集"
        className="max-w-md"
      >
        {editingWholesale && (
          <form onSubmit={handleUpdateWholesale}>
            <div className="space-y-4">
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">企業</div>
                <div className="text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
                  {editingWholesale.company?.name || editingWholesale.companyId}
                </div>
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">ステータス</div>
                <FormSelect
                  className="rounded-lg"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">稼働中</option>
                  <option value="paused">一時停止</option>
                  <option value="closed">終了</option>
                </FormSelect>
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">単価</div>
                <FormInput
                  type="number"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                  containerClassName="flex-1"
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">成立日</div>
                <DateInput
                  value={editForm.agreedDate}
                  onChange={(e) => setEditForm({ ...editForm, agreedDate: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">条件・メモ</div>
                <FormTextarea
                  rows={3}
                  value={editForm.conditions}
                  onChange={(e) => setEditForm({ ...editForm, conditions: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>
            {editError && (
              <div className="mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {editError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" onClick={() => setEditingWholesale(null)} variant="secondary" size="sm">
                キャンセル
              </Button>
              <Button type="submit" size="sm">
                保存
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          権限がないため、卸の追加・編集はできません。
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="卸の削除"
        description={
          deleteTarget
            ? `${deleteTarget.company?.name || deleteTarget.companyId} の卸を削除しますか？`
            : undefined
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        isLoading={isDeletingWholesale}
        onConfirm={confirmDeleteWholesale}
        onCancel={() => setDeleteTarget(null)}
      />
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

export default ProjectDetail
