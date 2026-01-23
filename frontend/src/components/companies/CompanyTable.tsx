import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import StatusBadge from '../ui/StatusBadge'
import { SkeletonTable } from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'
import { getAvatarColor, getInitials } from '../../utils/string'
import { cn } from '../../lib/cn'
import type { Company } from '../../types'

export type CompanyTableProps = {
  companies: Company[]
  isLoading: boolean
  canWrite: boolean
  onOpenCreateForm: () => void
}

function CompanyTable({ companies, isLoading, canWrite, onOpenCreateForm }: CompanyTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} columns={5} />
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase whitespace-nowrap text-slate-500">
          <tr>
            <th className="px-5 py-3">企業名</th>
            <th className="px-5 py-3">区分</th>
            <th className="px-5 py-3">ステータス</th>
            <th className="px-5 py-3">タグ</th>
            <th className="px-5 py-3">担当者</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {companies.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center">
                <EmptyState
                  message="企業が見つかりません"
                  description={
                    canWrite
                      ? '最初の企業を登録して管理を始めましょう。'
                      : '検索条件を見直してください。'
                  }
                  icon={
                    <svg
                      className="size-12 text-slate-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  }
                  action={
                    canWrite ? (
                      <Button onClick={onOpenCreateForm} className="mt-3 inline-flex items-center gap-2">
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        企業を追加
                      </Button>
                    ) : null
                  }
                />
              </td>
            </tr>
          ) : (
            companies.map((company) => (
              <tr key={company.id} className="group hover:bg-slate-50/80">
                <td className="px-5 py-4 min-w-0">
                  <Link to={`/companies/${company.id}`} className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white',
                        getAvatarColor(company.name)
                      )}
                    >
                      {getInitials(company.name)}
                    </div>
                    <span className="truncate font-semibold text-slate-900 group-hover:text-sky-600">
                      {company.name}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4 text-slate-600">{company.category || '-'}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={company.status} size="sm" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1">
                    {company.tags.length > 0 ? (
                      <>
                        {company.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                        {company.tags.length > 2 && (
                          <span className="text-xs text-slate-400">+{company.tags.length - 2}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{company.ownerId || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CompanyTable
