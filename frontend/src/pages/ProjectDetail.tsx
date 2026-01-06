import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CompanySearchSelect from '../components/CompanySearchSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import StatusBadge from '../components/ui/StatusBadge'
import { usePermissions } from '../hooks/usePermissions'
import { WHOLESALE_STATUS_LABELS } from '../constants'
import { apiRequest } from '../lib/apiClient'
import { formatDate } from '../utils/date'

interface Project {
  id: string
  name: string
  status: string
  companyId: string
  conditions?: string | null
  unitPrice?: number | null
}

interface Wholesale {
  id: string
  status: string
  companyId: string
  company?: { id: string; name: string }
  unitPrice?: number | null
  margin?: number | null
  conditions?: string | null
  agreedDate?: string | null
}

function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { canWrite } = usePermissions()
  const [project, setProject] = useState<Project | null>(null)
  const [wholesales, setWholesales] = useState<Wholesale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({
    companyId: '',
    status: 'active',
    unitPrice: '',
    margin: '',
    conditions: '',
    agreedDate: '',
  })
  const [formError, setFormError] = useState('')

  // 編集モーダル用state
  const [editingWholesale, setEditingWholesale] = useState<Wholesale | null>(null)
  const [editForm, setEditForm] = useState({
    status: 'active',
    unitPrice: '',
    margin: '',
    conditions: '',
    agreedDate: '',
  })
  const [editError, setEditError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Wholesale | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError('')
    try {
      const [projectData, wholesaleData] = await Promise.all([
        apiRequest<{ project: Project }>(`/api/projects/${id}`),
        apiRequest<{ wholesales: Wholesale[] }>(`/api/projects/${id}/wholesales`),
      ])

      setProject(projectData.project)
      setWholesales(wholesaleData.wholesales ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setFormError('')
    if (!form.companyId) {
      setFormError('卸先企業を選択してください')
      return
    }

    try {
      await apiRequest('/api/wholesales', {
        method: 'POST',
        body: {
          projectId: id,
          companyId: form.companyId,
          status: form.status,
          unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
          margin: form.margin ? parseFloat(form.margin) : undefined,
          conditions: form.conditions || undefined,
          agreedDate: form.agreedDate || undefined,
        },
      })
      setForm({ companyId: '', status: 'active', unitPrice: '', margin: '', conditions: '', agreedDate: '' })
      setShowCreateForm(false)
      fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error')
    }
  }

  const openEditModal = (wholesale: Wholesale) => {
    setEditingWholesale(wholesale)
    setEditForm({
      status: wholesale.status,
      unitPrice: wholesale.unitPrice?.toString() || '',
      margin: wholesale.margin?.toString() || '',
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
      await apiRequest(`/api/wholesales/${editingWholesale.id}`, {
        method: 'PATCH',
        body: {
          status: editForm.status,
          unitPrice: editForm.unitPrice ? parseFloat(editForm.unitPrice) : null,
          margin: editForm.margin ? parseFloat(editForm.margin) : null,
          conditions: editForm.conditions || null,
          agreedDate: editForm.agreedDate || null,
        },
      })
      setEditingWholesale(null)
      fetchData()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Network error')
    }
  }

  const handleDeleteWholesale = (wholesale: Wholesale) => {
    setDeleteError('')
    setDeleteTarget(wholesale)
  }

  const confirmDeleteWholesale = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')

    try {
      await apiRequest(`/api/wholesales/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'ネットワークエラー')
    } finally {
      setIsDeleting(false)
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

  return (
    <div className="space-y-6 animate-fade-up">
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
        <h3 className="text-lg font-semibold text-slate-900">案件情報</h3>
        <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">ステータス</dt>
            <dd className="mt-1">
              <StatusBadge
                status={WHOLESALE_STATUS_LABELS[project.status] || project.status}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">企業</dt>
            <dd className="mt-1 text-slate-800">
              <Link to={`/companies/${project.companyId}`} className="text-sky-600 hover:text-sky-700 hover:underline">
                {project.companyId}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">単価</dt>
            <dd className="mt-1 text-slate-800">{formatCurrency(project.unitPrice)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">条件</dt>
            <dd className="mt-1 text-slate-800">{project.conditions || '-'}</dd>
          </div>
        </dl>
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
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="例: 10000"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">マージン (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="例: 15"
                  value={form.margin}
                  onChange={(e) => setForm({ ...form, margin: e.target.value })}
                />
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
              >
                追加
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
                  <th className="px-4 py-3 font-medium text-right">マージン</th>
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
                    <td className="px-4 py-3 text-right font-mono">
                      {wholesale.margin != null ? `${wholesale.margin}%` : '-'}
                    </td>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">単価</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={editForm.unitPrice}
                      onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">マージン (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={editForm.margin}
                      onChange={(e) => setEditForm({ ...editForm, margin: e.target.value })}
                    />
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
        isLoading={isDeleting}
        onConfirm={confirmDeleteWholesale}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default ProjectDetail
