import { useState } from 'react'
import ExportCard from '../components/ui/ExportCard'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import { useFetch } from '../hooks/useApi'
import { apiDownload } from '../lib/apiClient'
import { apiRoutes } from '../lib/apiRoutes'
import { CompanyOptions, ExportCompanyFilters, ExportTaskFilters } from '../types'
import { buildQueryString } from '../utils/queryString'
import { TARGET_TYPE_OPTIONS, TASK_STATUS_OPTIONS, statusLabel, targetTypeLabel } from '../constants/labels'

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
        <ExportCard
          title="企業エクスポート"
          onDownload={() =>
            downloadFile(apiRoutes.exports.companies(), 'companies.csv', companyFilters)
          }
          isLoading={activeDownload === 'companies'}
          loadingLabel="ダウンロード中..."
          buttonLabel="CSVをダウンロード"
        >
          <FormInput
            type="date"
            value={companyFilters.from}
            onChange={(e) => setCompanyFilters({ ...companyFilters, from: e.target.value })}
            placeholder="開始日"
          />
          <FormInput
            type="date"
            value={companyFilters.to}
            onChange={(e) => setCompanyFilters({ ...companyFilters, to: e.target.value })}
            placeholder="終了日"
          />
          <FormSelect
            value={companyFilters.status}
            onChange={(e) => setCompanyFilters({ ...companyFilters, status: e.target.value })}
          >
            <option value="">ステータス</option>
            {companyOptions.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            value={companyFilters.category}
            onChange={(e) => setCompanyFilters({ ...companyFilters, category: e.target.value })}
          >
            <option value="">区分</option>
            {companyOptions.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            value={companyFilters.tag}
            onChange={(e) => setCompanyFilters({ ...companyFilters, tag: e.target.value })}
          >
            <option value="">タグ</option>
            {companyOptions.tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            value={companyFilters.ownerId}
            onChange={(e) => setCompanyFilters({ ...companyFilters, ownerId: e.target.value })}
          >
            <option value="">担当者</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </FormSelect>
        </ExportCard>
        <ExportCard
          title="タスクエクスポート"
          onDownload={() => downloadFile(apiRoutes.exports.tasks(), 'tasks.csv', taskFilters)}
          isLoading={activeDownload === 'tasks'}
          loadingLabel="ダウンロード中..."
          buttonLabel="CSVをダウンロード"
        >
          <FormInput
            type="date"
            value={taskFilters.dueFrom}
            onChange={(e) => setTaskFilters({ ...taskFilters, dueFrom: e.target.value })}
            placeholder="期日(開始)"
          />
          <FormInput
            type="date"
            value={taskFilters.dueTo}
            onChange={(e) => setTaskFilters({ ...taskFilters, dueTo: e.target.value })}
            placeholder="期日(終了)"
          />
          <FormSelect
            value={taskFilters.status}
            onChange={(e) => setTaskFilters({ ...taskFilters, status: e.target.value })}
          >
            <option value="">ステータス</option>
            {TASK_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabel('task', status)}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            value={taskFilters.targetType}
            onChange={(e) => setTaskFilters({ ...taskFilters, targetType: e.target.value })}
          >
            <option value="">対象</option>
            {TARGET_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {targetTypeLabel(type)}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            value={taskFilters.assigneeId}
            onChange={(e) => setTaskFilters({ ...taskFilters, assigneeId: e.target.value })}
          >
            <option value="">担当者</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </FormSelect>
        </ExportCard>
      </div>
    </div>
  )
}

export default Exports
