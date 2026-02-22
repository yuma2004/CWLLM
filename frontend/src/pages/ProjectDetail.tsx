import { Link } from 'react-router-dom'
import { CompanySearchSelect } from '../components/SearchSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import DateInput from '../components/ui/DateInput'
import EmptyState from '../components/ui/EmptyState'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import LoadingState from '../components/ui/LoadingState'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import { PROJECT_STATUS_OPTIONS, statusLabel } from '../constants/labels'
import { useProjectDetailPage } from '../features/projects/useProjectDetailPage'
import { formatDate } from '../utils/date'
import { formatCurrency } from '../utils/format'

function ProjectDetail() {
  const {
    canWrite,
    showCreateForm,
    setShowCreateForm,
    form,
    setForm,
    formError,
    isEditingProject,
    setIsEditingProject,
    projectForm,
    setProjectForm,
    projectFormError,
    editingWholesale,
    setEditingWholesale,
    editForm,
    setEditForm,
    editError,
    deleteTarget,
    setDeleteTarget,
    deleteError,
    toast,
    clearToast,
    project,
    wholesales,
    isLoading,
    error,
    isCreatingWholesale,
    isDeletingWholesale,
    isUpdatingProject,
    userOptions,
    ownerLabel,
    handleCancelProjectEdit,
    handleUpdateProject,
    handleCreateWholesale,
    openEditModal,
    handleUpdateWholesale,
    handleDeleteWholesale,
    confirmDeleteWholesale,
  } = useProjectDetailPage()

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase text-slate-400">案件詳細</p>
          <h2 className="text-3xl font-bold text-slate-900">{project.name}</h2>
        </div>
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-700">
          一覧に戻る
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">案件情報</h3>
          {canWrite && !isEditingProject && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProject(true)}>
              編集
            </Button>
          )}
        </div>

        {isEditingProject ? (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="案件名"
                value={projectForm.name}
                onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
                placeholder="案件名を入力"
              />
              <FormSelect
                label="ステータス"
                value={projectForm.status}
                onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value })}
              >
                {PROJECT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel('project', status)}
                  </option>
                ))}
              </FormSelect>
              <FormInput
                label="単価"
                type="number"
                value={projectForm.unitPrice}
                onChange={(event) => setProjectForm({ ...projectForm, unitPrice: event.target.value })}
                placeholder="例: 50000"
              />
              <FormSelect
                label="担当者"
                value={projectForm.ownerId}
                onChange={(event) => setProjectForm({ ...projectForm, ownerId: event.target.value })}
              >
                <option value="">担当者未設定</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </FormSelect>
              <DateInput
                label="開始日"
                value={projectForm.periodStart}
                onChange={(event) => setProjectForm({ ...projectForm, periodStart: event.target.value })}
              />
              <DateInput
                label="終了日"
                value={projectForm.periodEnd}
                onChange={(event) => setProjectForm({ ...projectForm, periodEnd: event.target.value })}
              />
            </div>
            <FormTextarea
              label="条件・メモ"
              value={projectForm.conditions}
              onChange={(event) => setProjectForm({ ...projectForm, conditions: event.target.value })}
              className="min-h-[88px]"
            />
            {projectFormError && <ErrorAlert message={projectFormError} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleCancelProjectEdit}>
                キャンセル
              </Button>
              <Button type="submit" size="sm" isLoading={isUpdatingProject} loadingLabel="保存中...">
                保存
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-400">ステータス</dt>
              <dd className="mt-1">
                <StatusBadge status={project.status ?? 'active'} kind="project" size="sm" />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">企業</dt>
              <dd className="mt-1 text-slate-800">{project.company?.name || project.companyId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">担当者</dt>
              <dd className="mt-1 text-slate-800">{ownerLabel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">単価</dt>
              <dd className="mt-1 text-slate-800">{formatCurrency(project.unitPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">期間</dt>
              <dd className="mt-1 text-slate-800">
                {project.periodStart || project.periodEnd
                  ? `${formatDate(project.periodStart)} - ${formatDate(project.periodEnd)}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">条件</dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-800">{project.conditions || '-'}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">卸一覧</h3>
            <p className="text-xs text-slate-400">{wholesales.length} 件</p>
          </div>
          {canWrite && (
            <Button type="button" size="sm" onClick={() => setShowCreateForm((prev) => !prev)}>
              {showCreateForm ? '作成フォームを閉じる' : '卸を追加'}
            </Button>
          )}
        </div>

        {showCreateForm && canWrite && (
          <form onSubmit={handleCreateWholesale} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <CompanySearchSelect
              label="企業"
              value={form.companyId}
              onChange={(companyId) => setForm({ ...form, companyId })}
              placeholder="企業名で検索"
            />
            <FormSelect
              label="ステータス"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              <option value="active">稼働中</option>
              <option value="paused">一時停止</option>
              <option value="closed">終了</option>
            </FormSelect>
            <FormInput
              label="単価"
              type="number"
              value={form.unitPrice}
              onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
              placeholder="例: 10000"
            />
            <DateInput
              label="成立日"
              value={form.agreedDate}
              onChange={(event) => setForm({ ...form, agreedDate: event.target.value })}
            />
            <FormTextarea
              label="条件・メモ"
              value={form.conditions}
              onChange={(event) => setForm({ ...form, conditions: event.target.value })}
              className="min-h-[88px] md:col-span-2"
            />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" isLoading={isCreatingWholesale} loadingLabel="追加中...">
                追加
              </Button>
            </div>
          </form>
        )}

        {formError && <ErrorAlert message={formError} />}
        {deleteError && <ErrorAlert message={deleteError} />}

        {wholesales.length === 0 ? (
          <EmptyState message="卸がありません" description="必要に応じて卸データを追加してください。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">企業</th>
                  <th className="px-4 py-3">ステータス</th>
                  <th className="px-4 py-3 text-right">単価</th>
                  <th className="px-4 py-3">成立日</th>
                  <th className="px-4 py-3">条件</th>
                  {canWrite && <th className="px-4 py-3 text-right">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wholesales.map((wholesale) => (
                  <tr key={wholesale.id}>
                    <td className="px-4 py-3">{wholesale.company?.name || wholesale.companyId}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={wholesale.status} kind="wholesale" size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(wholesale.unitPrice)}
                    </td>
                    <td className="px-4 py-3">{formatDate(wholesale.agreedDate)}</td>
                    <td className="px-4 py-3">{wholesale.conditions || '-'}</td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(wholesale)}
                          className="mr-2"
                        >
                          編集
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWholesale(wholesale)}
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
          </div>
        )}
      </Card>

      <Modal
        isOpen={Boolean(editingWholesale)}
        onClose={() => setEditingWholesale(null)}
        title="卸を編集"
        className="max-w-md"
      >
        {editingWholesale && (
          <form onSubmit={handleUpdateWholesale} className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {editingWholesale.company?.name || editingWholesale.companyId}
            </div>
            <FormSelect
              label="ステータス"
              value={editForm.status}
              onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
            >
              <option value="active">稼働中</option>
              <option value="paused">一時停止</option>
              <option value="closed">終了</option>
            </FormSelect>
            <FormInput
              label="単価"
              type="number"
              value={editForm.unitPrice}
              onChange={(event) => setEditForm({ ...editForm, unitPrice: event.target.value })}
            />
            <DateInput
              label="成立日"
              value={editForm.agreedDate}
              onChange={(event) => setEditForm({ ...editForm, agreedDate: event.target.value })}
            />
            <FormTextarea
              label="条件・メモ"
              value={editForm.conditions}
              onChange={(event) => setEditForm({ ...editForm, conditions: event.target.value })}
              className="min-h-[88px]"
            />
            {editError && <ErrorAlert message={editError} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingWholesale(null)}>
                キャンセル
              </Button>
              <Button type="submit">保存</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="卸の削除"
        description={
          deleteTarget
            ? `${deleteTarget.company?.name || deleteTarget.companyId} の卸を削除しますか?`
            : undefined
        }
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        isLoading={isDeletingWholesale}
        onConfirm={() => {
          void confirmDeleteWholesale()
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          権限がないため、卸の追加・編集はできません。
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

export default ProjectDetail
