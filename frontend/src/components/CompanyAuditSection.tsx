import { useMemo } from 'react'
import ErrorAlert from './ui/ErrorAlert'
import { useFetch } from '../hooks/useApi'
import { ApiListResponse, AuditLog } from '../types'

function CompanyAuditSection({ companyId }: { companyId: string }) {
  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      entityType: 'Company',
      entityId: companyId,
      page: '1',
      pageSize: '10',
    })
    return params.toString()
  }, [companyId])

  const { data, error, isLoading } = useFetch<ApiListResponse<AuditLog>>(
    `/api/audit-logs?${queryString}`,
    {
      errorMessage: 'ネットワークエラー',
    }
  )

  const logs = data?.items ?? []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">監査ログ</h3>
      </div>
      {error && <ErrorAlert message={error} className="mt-3" />}
      {isLoading ? (
        <div className="mt-3 text-sm text-slate-500">監査ログを読み込み中...</div>
      ) : logs.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">監査ログはありません。</div>
      ) : (
        <div className="mt-4 space-y-2 text-sm">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2"
            >
              <div>
                <div className="font-semibold text-slate-900">{log.action}</div>
                <div className="text-xs text-slate-500">
                  {log.userEmail || log.userId || 'system'} /{' '}
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CompanyAuditSection
