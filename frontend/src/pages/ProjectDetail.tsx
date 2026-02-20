import { Link } from 'react-router-dom'
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
import Toast from '../components/ui/Toast'
import { PROJECT_STATUS_OPTIONS, statusLabel } from '../constants/labels'
import { formatDate } from '../utils/date'
import { formatCurrency } from '../utils/format'
import { useProjectDetailPage } from '../features/projects/useProjectDetailPage'
function ProjectDetail() {
  const {
    id,
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
    return <div className="text-slate-500">譯井ｻｶ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲・/div>
  }

  return (
    <div className="space-y-4">
      <nav className="text-xs text-slate-400">
        <Link to="/projects" className="hover:text-slate-600">
          譯井ｻｶ荳隕ｧ
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-500">{project.name}</span>
      </nav>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">譯井ｻｶ隧ｳ邏ｰ</p>
          <h2 className="text-3xl font-bold text-slate-900">{project.name}</h2>
        </div>
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-700">
          荳隕ｧ縺ｫ謌ｻ繧・
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">繧ｹ繝・・繧ｿ繧ｹ</div>
          <div className="mt-1">
            <StatusBadge status={project.status ?? '-'} kind="project" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">莨∵･ｭ</div>
          <Link
            to={`/companies/${project.companyId}`}
            className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            {project.company?.name || project.companyId}
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">諡・ｽ楢・/div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{ownerLabel}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">譛滄俣</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {project.periodStart || project.periodEnd
              ? `${formatDate(project.periodStart)} ? ${formatDate(project.periodEnd)}`
              : '-'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">蜊倅ｾ｡</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {formatCurrency(project.unitPrice)}
          </div>
        </div>
      </div>

      {deleteError && <ErrorAlert message={deleteError} />}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">譯井ｻｶ諠・ｱ</h3>
          {canWrite && !isEditingProject && (
            <Button
              type="button"
              onClick={() => setIsEditingProject(true)}
              variant="ghost"
              size="sm"
              className="text-sky-600 hover:text-sky-700"
            >
              邱ｨ髮・
            </Button>
          )}
        </div>

        {isEditingProject ? (
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">
                  譯井ｻｶ蜷・<span className="text-rose-500">*</span>
                </div>
                <FormInput
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  placeholder="譯井ｻｶ蜷阪ｒ蜈･蜉・
                />
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">繧ｹ繝・・繧ｿ繧ｹ</div>
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
                <div className="mb-1 block text-xs font-medium text-slate-600">蜊倅ｾ｡</div>
                <FormInput
                  type="number"
                  value={projectForm.unitPrice}
                  onChange={(e) => setProjectForm({ ...projectForm, unitPrice: e.target.value })}
                  placeholder="萓・ 50000"
                />
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">諡・ｽ楢・/div>
                <FormSelect
                  value={projectForm.ownerId}
                  onChange={(e) => setProjectForm({ ...projectForm, ownerId: e.target.value })}
                >
                  <option value="">諡・ｽ楢・悴險ｭ螳・/option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">髢句ｧ区律</div>
                <DateInput
                  value={projectForm.periodStart}
                  onChange={(e) => setProjectForm({ ...projectForm, periodStart: e.target.value })}
                />
              </div>
              <div>
                <div className="mb-1 block text-xs font-medium text-slate-600">邨ゆｺ・律</div>
                <DateInput
                  value={projectForm.periodEnd}
                  onChange={(e) => setProjectForm({ ...projectForm, periodEnd: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="mb-1 block text-xs font-medium text-slate-600">譚｡莉ｶ繝ｻ繝｡繝｢</div>
                <FormTextarea
                  value={projectForm.conditions}
                  onChange={(e) => setProjectForm({ ...projectForm, conditions: e.target.value })}
                  placeholder="譚｡莉ｶ繧・｣懆ｶｳ繧貞・蜉・
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
                繧ｭ繝｣繝ｳ繧ｻ繝ｫ
              </Button>
              <Button type="submit" size="sm" isLoading={isUpdatingProject} loadingLabel="菫晏ｭ倅ｸｭ...">
                菫晏ｭ・
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-400">繧ｹ繝・・繧ｿ繧ｹ</dt>
              <dd className="mt-1">
                <StatusBadge status={project.status ?? '-'} kind="project" />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">莨∵･ｭ</dt>
              <dd className="mt-1 text-slate-800">
                <Link to={`/companies/${project.companyId}`} className="text-sky-600 hover:text-sky-700 hover:underline">
                  {project.company?.name || project.companyId}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">蜊倅ｾ｡</dt>
              <dd className="mt-1 text-slate-800">{formatCurrency(project.unitPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">諡・ｽ楢・/dt>
              <dd className="mt-1 text-slate-800">{ownerLabel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">譛滄俣</dt>
              <dd className="mt-1 text-slate-800">
                {project.periodStart || project.periodEnd
                  ? `${formatDate(project.periodStart)} ? ${formatDate(project.periodEnd)}`
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">譚｡莉ｶ</dt>
              <dd className="mt-1 text-slate-800 whitespace-pre-wrap">{project.conditions || '-'}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">蜊ｸ荳隕ｧ</h3>
            <p className="text-xs text-slate-400 mt-1">{wholesales.length} 莉ｶ</p>
          </div>
          {canWrite && (
            <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
              {showCreateForm ? '繧ｭ繝｣繝ｳ繧ｻ繝ｫ' : '蜊ｸ繧定ｿｽ蜉'}
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
                <div className="block text-xs font-medium text-slate-600 mb-1">莨∵･ｭ *</div>
                <CompanySearchSelect
                  value={form.companyId}
                  onChange={(companyId) => setForm({ ...form, companyId })}
                  placeholder="莨∵･ｭ蜷阪〒讀懃ｴ｢"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">繧ｹ繝・・繧ｿ繧ｹ</div>
                <FormSelect
                  className="rounded-lg"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">遞ｼ蜒堺ｸｭ</option>
                  <option value="paused">荳譎ょ●豁｢</option>
                  <option value="closed">邨ゆｺ・/option>
                </FormSelect>
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">蜊倅ｾ｡</div>
                <FormInput
                  type="number"
                  placeholder="萓・ 10000"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  containerClassName="flex-1"
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">謌千ｫ区律</div>
                <DateInput
                  value={form.agreedDate}
                  onChange={(e) => setForm({ ...form, agreedDate: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <div className="block text-xs font-medium text-slate-600 mb-1">譚｡莉ｶ繝ｻ繝｡繝｢</div>
                <FormInput
                  type="text"
                  placeholder="譚｡莉ｶ繧・｣懆ｶｳ繧貞・蜉・
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
              <Button type="submit" size="sm" isLoading={isCreatingWholesale} loadingLabel="菴懈・荳ｭ...">
                霑ｽ蜉
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-x-auto">
          {wholesales.length === 0 ? (
            <EmptyState className="py-8" message="蜊ｸ縺後≠繧翫∪縺帙ｓ" />
          ) : (
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">莨∵･ｭ</th>
                  <th className="px-4 py-3 font-medium">繧ｹ繝・・繧ｿ繧ｹ</th>
                  <th className="px-4 py-3 font-medium text-right">蜊倅ｾ｡</th>
                  <th className="px-4 py-3 font-medium">謌千ｫ区律</th>
                  <th className="px-4 py-3 font-medium">譚｡莉ｶ</th>
                  {canWrite && <th className="px-4 py-3 font-medium text-right">謫堺ｽ・/th>}
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
                          邱ｨ髮・
                        </Button>
                        <Button
                          onClick={() => handleDeleteWholesale(wholesale)}
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                        >
                          蜑企勁
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
        title="蜊ｸ縺ｮ邱ｨ髮・
        className="max-w-md"
      >
        {editingWholesale && (
          <form onSubmit={handleUpdateWholesale}>
            <div className="space-y-4">
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">莨∵･ｭ</div>
                <div className="text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
                  {editingWholesale.company?.name || editingWholesale.companyId}
                </div>
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">繧ｹ繝・・繧ｿ繧ｹ</div>
                <FormSelect
                  className="rounded-lg"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">遞ｼ蜒堺ｸｭ</option>
                  <option value="paused">荳譎ょ●豁｢</option>
                  <option value="closed">邨ゆｺ・/option>
                </FormSelect>
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">蜊倅ｾ｡</div>
                <FormInput
                  type="number"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                  containerClassName="flex-1"
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">謌千ｫ区律</div>
                <DateInput
                  value={editForm.agreedDate}
                  onChange={(e) => setEditForm({ ...editForm, agreedDate: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="block text-xs font-medium text-slate-600 mb-1">譚｡莉ｶ繝ｻ繝｡繝｢</div>
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
                繧ｭ繝｣繝ｳ繧ｻ繝ｫ
              </Button>
              <Button type="submit" size="sm">
                菫晏ｭ・
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          讓ｩ髯舌′縺ｪ縺・◆繧√∝査縺ｮ霑ｽ蜉繝ｻ邱ｨ髮・・縺ｧ縺阪∪縺帙ｓ縲・
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="蜊ｸ縺ｮ蜑企勁"
        description={
          deleteTarget
            ? `${deleteTarget.company?.name || deleteTarget.companyId} 縺ｮ蜊ｸ繧貞炎髯､縺励∪縺吶°・歔
            : undefined
        }
        confirmLabel="蜑企勁縺吶ｋ"
        cancelLabel="繧ｭ繝｣繝ｳ繧ｻ繝ｫ"
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

