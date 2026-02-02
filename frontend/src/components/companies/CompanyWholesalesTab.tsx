import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState'
import ErrorAlert from '../ui/ErrorAlert'
import { Skeleton, SkeletonText } from '../ui/Skeleton'
import StatusBadge from '../ui/StatusBadge'
import { formatDate } from '../../utils/date'
import { formatCurrency } from '../../utils/format'
import type { Wholesale } from '../../types'

type CompanyWholesalesTabProps = {
  wholesales: Wholesale[]
  isLoading: boolean
  error?: string
}

function CompanyWholesalesTab({ wholesales, isLoading, error }: CompanyWholesalesTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-3">
              <SkeletonText lines={2} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorAlert message={error} />
  }

  if (wholesales.length === 0) {
    return (
      <EmptyState
        message="卸がありません"
        description="案件詳細から卸を追加できます。"
        action={
          <Link to="/projects" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
            案件一覧へ
          </Link>
        }
        className="py-12"
      />
    )
  }

  return (
    <div className="space-y-3">
      {wholesales.map((wholesale) => (
        <div
          key={wholesale.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/wholesales/${wholesale.id}`}
              className="text-base font-semibold text-slate-900 hover:text-sky-600"
            >
              {wholesale.project?.name || `卸 ${wholesale.id}`}
            </Link>
            <StatusBadge status={wholesale.status} kind="wholesale" size="sm" />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>案件: {wholesale.project?.name || wholesale.projectId}</span>
            <span>単価: {formatCurrency(wholesale.unitPrice)}</span>
            <span>マージン: {wholesale.margin != null ? `${wholesale.margin}%` : '-'}</span>
            <span>成立日: {formatDate(wholesale.agreedDate)}</span>
          </div>
          {wholesale.conditions && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-700">{wholesale.conditions}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default CompanyWholesalesTab
