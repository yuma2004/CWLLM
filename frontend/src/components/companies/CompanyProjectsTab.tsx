import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState'
import ErrorAlert from '../ui/ErrorAlert'
import { Skeleton, SkeletonText } from '../ui/Skeleton'
import StatusBadge from '../ui/StatusBadge'
import { formatDate } from '../../utils/date'
import { formatCurrency } from '../../utils/format'
import type { Project } from '../../types'

type CompanyProjectsTabProps = {
  projects: Project[]
  isLoading: boolean
  error?: string
}

const formatPeriod = (project: Project) => {
  const startLabel = project.periodStart ? formatDate(project.periodStart) : ''
  const endLabel = project.periodEnd ? formatDate(project.periodEnd) : ''
  if (startLabel && endLabel) return `${startLabel} 〜 ${endLabel}`
  if (startLabel) return `${startLabel} 〜`
  if (endLabel) return `〜 ${endLabel}`
  return '-'
}

function CompanyProjectsTab({ projects, isLoading, error }: CompanyProjectsTabProps) {
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

  if (projects.length === 0) {
    return (
      <EmptyState
        message="案件がありません"
        description="案件一覧から追加できます。"
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
      {projects.map((project) => (
        <div
          key={project.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/projects/${project.id}`}
              className="text-base font-semibold text-slate-900 hover:text-sky-600"
            >
              {project.name}
            </Link>
            <StatusBadge status={project.status} kind="project" size="sm" />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>期間: {formatPeriod(project)}</span>
            <span>単価: {formatCurrency(project.unitPrice)}</span>
            <span>更新: {formatDate(project.updatedAt || project.createdAt)}</span>
          </div>
          {project.conditions && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-700">{project.conditions}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default CompanyProjectsTab
