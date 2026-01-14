import { useState } from 'react'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import { useFetch } from '../hooks/useApi'
import { apiDownload } from '../lib/apiClient'
import { apiRoutes } from '../lib/apiRoutes'
import { CompanyOptions, ExportCompanyFilters, ExportTaskFilters } from '../types'
import { buildQueryString } from '../utils/queryString'
import { TARGET_TYPE_OPTIONS, TASK_STATUS_OPTIONS, statusLabel, targetTypeLabel } from '../constants'

type CompanyExportCardProps = {
  filters: ExportCompanyFilters
  onFiltersChange: (next: ExportCompanyFilters) => void
  companyOptions: CompanyOptions
  userOptions: Array<{ id: string; email: string }>
  onDownload: () => void
  isLoading: boolean
}

function CompanyExportCard({
  filters,
  onFiltersChange,
  companyOptions,
  userOptions,
  onDownload,
  isLoading,
}: CompanyExportCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">企業エクスポート</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormInput
          type="date"
          value={filters.from}
          onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
          placeholder="開始日"
        />
        <FormInput
          type="date"
          value={filters.to}
          onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
          placeholder="終了日"
        />
        <FormSelect
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        >
          <option value="">ステータス</option>
          {companyOptions.statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.category}
          onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
        >
          <option value="">区分</option>
          {companyOptions.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.tag}
          onChange={(e) => onFiltersChange({ ...filters, tag: e.target.value })}
        >
          <option value="">タグ</option>
          {companyOptions.tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.ownerId}
          onChange={(e) => onFiltersChange({ ...filters, ownerId: e.target.value })}
        >
          <option value="">担当者</option>
          {userOptions.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </FormSelect>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={onDownload}
          isLoading={isLoading}
          loadingLabel="ダウンロード中..."
        >
          CSVをダウンロード
        </Button>
      </div>
    </div>
  )
}

type TaskExportCardProps = {
  filters: ExportTaskFilters
  onFiltersChange: (next: ExportTaskFilters) => void
  userOptions: Array<{ id: string; email: string }>
  onDownload: () => void
  isLoading: boolean
}

function TaskExportCard({
  filters,
  onFiltersChange,
  userOptions,
  onDownload,
  isLoading,
}: TaskExportCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">タスクエクスポート</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormInput
          type="date"
          value={filters.dueFrom}
          onChange={(e) => onFiltersChange({ ...filters, dueFrom: e.target.value })}
          placeholder="期日(開始)"
        />
        <FormInput
          type="date"
          value={filters.dueTo}
          onChange={(e) => onFiltersChange({ ...filters, dueTo: e.target.value })}
          placeholder="期日(終了)"
        />
        <FormSelect
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        >
          <option value="">ステータス</option>
          {TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel('task', status)}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.targetType}
          onChange={(e) => onFiltersChange({ ...filters, targetType: e.target.value })}
        >
          <option value="">対象</option>
          {TARGET_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {targetTypeLabel(type)}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.assigneeId}
          onChange={(e) => onFiltersChange({ ...filters, assigneeId: e.target.value })}
        >
          <option value="">担当者</option>
          {userOptions.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </FormSelect>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={onDownload}
          isLoading={isLoading}
          loadingLabel="ダウンロード中..."
        >
          CSVをダウンロード
        </Button>
      </div>
    </div>
  )
}

function Exports() {
  const [error, setError] = useState('')
  const [activeDownload, setActiveDownload] = useState<'companies' | 'tasks' | ''>('')
  const [companyFilters, setCompanyFilters] = useState<ExportCompanyFilters>({
    from: '',
    to: '',
    status: '',
    category: '',
    tag: '',
    ownerId: '',
  })
  const [taskFilters, setTaskFilters] = useState<ExportTaskFilters>({
    dueFrom: '',
    dueTo: '',
    status: '',
    targetType: '',
    assigneeId: '',
  })

  const { data: companyOptionsData } = useFetch<CompanyOptions>(apiRoutes.companies.options(), {
    errorMessage: '候補の取得に失敗しました',
    cacheTimeMs: 30_000,
  })

  const { data: userOptionsData } = useFetch<{ users: Array<{ id: string; email: string }> }>(
    apiRoutes.users.options(),
    {
      errorMessage: '候補の取得に失敗しました',
      cacheTimeMs: 30_000,
    }
  )

  const companyOptions = companyOptionsData ?? { categories: [], statuses: [], tags: [] }
  const userOptions = userOptionsData?.users ?? []

  const downloadFile = async (path: string, filename: string, params: Record<string, string>) => {
    setError('')
    setActiveDownload(filename.includes('companies') ? 'companies' : 'tasks')
    try {
      const query = buildQueryString(params)
      const url = query ? `${path}?${query}` : path
      const blob = await apiDownload(url)
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ダウンロードに失敗しました')
    } finally {
      setActiveDownload('')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Export</p>
        <h2 className="text-3xl font-bold text-slate-900">CSVエクスポート</h2>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <CompanyExportCard
          filters={companyFilters}
          onFiltersChange={setCompanyFilters}
          companyOptions={companyOptions}
          userOptions={userOptions}
          onDownload={() =>
            downloadFile(apiRoutes.exports.companies(), 'companies.csv', companyFilters)
          }
          isLoading={activeDownload === 'companies'}
        />
        <TaskExportCard
          filters={taskFilters}
          onFiltersChange={setTaskFilters}
          userOptions={userOptions}
          onDownload={() => downloadFile(apiRoutes.exports.tasks(), 'tasks.csv', taskFilters)}
          isLoading={activeDownload === 'tasks'}
        />
      </div>
    </div>
  )
}

export default Exports
