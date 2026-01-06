import { useCallback, useEffect, useState } from 'react'
import ErrorAlert from './ui/ErrorAlert'
import { apiRequest } from '../lib/apiClient'
import { ApiListResponse } from '../types'

interface AuditLog {
  id: string
  action: string
  userId?: string | null
  userEmail?: string | null
  createdAt: string
}

function CompanyAuditSection({ companyId }: { companyId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        entityType: 'Company',
        entityId: companyId,
        page: '1',
        pageSize: '10',
      })
      const data = await apiRequest<ApiListResponse<AuditLog>>(
        `/api/audit-logs?${params.toString()}`
      )
      setLogs(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

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
