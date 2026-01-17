import Button from './Button'
import { JobRecord } from '../../types'
import { cn } from '../../lib/cn'

type JobProgressSummaryItem = {
  label: string
  value: string | number
}

type JobProgressInfo = {
  total?: number
  processed?: number
  summary?: JobProgressSummaryItem[]
}

type JobProgressCardProps = {
  title: string
  job: JobRecord
  progress?: JobProgressInfo
  isPolling?: boolean
  onCancel?: () => void
}

const getStatusLabel = (status: JobRecord['status']) => {
  switch (status) {
    case 'queued':
      return '待機中'
    case 'processing':
      return '処理中'
    case 'completed':
      return '完了'
    case 'failed':
      return '失敗'
    case 'canceled':
      return 'キャンセル済み'
    default:
      return '不明'
  }
}

const getStatusTone = (status: JobRecord['status']) => {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700'
  if (status === 'failed') return 'bg-rose-100 text-rose-700'
  if (status === 'canceled') return 'bg-slate-200 text-slate-600'
  if (status === 'processing') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

const JobProgressCard = ({
  title,
  job,
  progress,
  isPolling,
  onCancel,
}: JobProgressCardProps) => {
  const hasProgress =
    typeof progress?.total === 'number' && typeof progress?.processed === 'number'
  const processed = progress?.processed ?? 0
  const total = progress?.total ?? 0
  const percent = hasProgress && total ? Math.min((processed / total) * 100, 100) : 0
  const canCancel = onCancel && ['queued', 'processing'].includes(job.status)

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-slate-900">{title}</div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              キャンセル
            </Button>
          )}
          <span
            className={cn('rounded-full px-2 py-0.5 text-xs font-semibold uppercase', getStatusTone(job.status))}
          >
            {getStatusLabel(job.status)}
          </span>
        </div>
      </div>

      <div className="mt-2">
        {hasProgress ? (
          <>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {progress?.processed ?? 0}/{progress?.total ?? 0}
            </div>
          </>
        ) : (
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 w-1/3 rounded-full bg-slate-400/70" />
          </div>
        )}
      </div>

      {job.error?.message && (
        <div className="mt-2 text-xs text-rose-600">{job.error.message}</div>
      )}

      {job.status === 'completed' && progress?.summary && progress.summary.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
          {progress.summary.map((item) => (
            <span key={`${item.label}-${item.value}`} className="rounded-full bg-slate-100 px-2 py-0.5">
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      )}

      {isPolling && (
        <div className="mt-2 text-xs text-slate-400">更新中...</div>
      )}
    </div>
  )
}

export default JobProgressCard
