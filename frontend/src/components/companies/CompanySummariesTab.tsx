import EmptyState from '../ui/EmptyState'
import ErrorAlert from '../ui/ErrorAlert'
import { Skeleton, SkeletonText } from '../ui/Skeleton'
import { formatDate } from '../../utils/date'
import type { Summary } from '../../types'

type CompanySummariesTabProps = {
  summaries: Summary[]
  isLoading: boolean
  error?: string
}

const summaryTypeLabel = (type?: string) => {
  if (!type || type === 'manual') return '手動'
  return type
}

function CompanySummariesTab({ summaries, isLoading, error }: CompanySummariesTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((item) => (
          <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="mt-3">
              <SkeletonText lines={3} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorAlert message={error} />
  }

  if (summaries.length === 0) {
    return (
      <EmptyState
        message="サマリーがありません"
        description="期間を指定してサマリーを作成できます。"
        className="py-12"
      />
    )
  }

  return (
    <div className="space-y-3">
      {summaries.map((summary) => {
        const periodLabel = `${formatDate(summary.periodStart)} 〜 ${formatDate(summary.periodEnd)}`
        return (
          <details
            key={summary.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">期間</div>
                <div className="text-sm font-semibold text-slate-900">{periodLabel}</div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                  {summaryTypeLabel(summary.type)}
                </span>
                <span>作成: {formatDate(summary.createdAt)}</span>
                {summary.sourceLinks?.length ? (
                  <span>参照: {summary.sourceLinks.length}件</span>
                ) : null}
              </div>
            </summary>
            <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
              {summary.content}
            </div>
          </details>
        )
      })}
    </div>
  )
}

export default CompanySummariesTab
