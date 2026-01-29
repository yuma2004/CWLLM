import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import MultiSelect from '../ui/MultiSelect'
import StatusBadge from '../ui/StatusBadge'
import { SkeletonTable } from '../ui/Skeleton'
import EmptyState from '../ui/EmptyState'
import { getAvatarColor, getInitials } from '../../utils/string'
import { cn } from '../../lib/cn'
import type { Company, User } from '../../types'

export type CompanyTableProps = {
  companies: Company[]
  isLoading: boolean
  canWrite: boolean
  userOptions: User[]
  isUpdatingOwner: boolean
  onOwnerChange: (companyId: string, ownerIds: string[]) => void
  onOpenCreateForm: () => void
}

function CompanyTable({
  companies,
  isLoading,
  canWrite,
  userOptions,
  isUpdatingOwner,
  onOwnerChange,
  onOpenCreateForm,
}: CompanyTableProps) {
  const getOwnerLabels = (ownerIds?: string[]) => {
    if (!ownerIds || ownerIds.length === 0) return []
    return ownerIds
      .map((ownerId) => {
        const owner = userOptions.find((user) => user.id === ownerId)
        return owner?.name || owner?.email || ownerId
      })
      .filter(Boolean)
  }

  const ownerOptions = userOptions.map((user) => ({
    value: user.id,
    label: user.name || user.email,
  }))

  const renderOwnerAvatars = (selectedLabels: string[]) => {
    if (selectedLabels.length === 0) {
      return <span className="text-sm text-notion-text-tertiary">未設定</span>
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {selectedLabels.slice(0, 3).map((label) => (
            <span
              key={label}
              className={cn(
                'flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white',
                getAvatarColor(label)
              )}
              title={label}
            >
              {getInitials(label)}
            </span>
          ))}
        </div>
        {selectedLabels.length > 3 && (
          <span className="text-xs text-notion-text-tertiary">+{selectedLabels.length - 3}</span>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <SkeletonTable rows={5} columns={5} />
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-notion-border bg-notion-bg shadow-sm">
      <table className="min-w-full divide-y divide-notion-border text-sm text-notion-text-secondary">
        <thead className="sticky top-0 z-10 bg-notion-bg-secondary text-left text-xs font-semibold uppercase whitespace-nowrap text-notion-text-tertiary">
          <tr>
            <th className="px-5 py-3">企業名</th>
            <th className="px-5 py-3">区分</th>
            <th className="px-5 py-3">ステータス</th>
            <th className="px-5 py-3">タグ</th>
            <th className="px-5 py-3">担当者</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-notion-border bg-notion-bg">
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
              <tr key={company.id} className="group hover:bg-notion-bg-hover">
                <td className="px-5 py-4 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <Link to={`/companies/${company.id}`} className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white',
                          getAvatarColor(company.name)
                        )}
                      >
                        {getInitials(company.name)}
                      </div>
                      <span className="truncate font-semibold text-notion-text group-hover:text-notion-accent">
                        {company.name}
                      </span>
                    </Link>
                    <Link
                      to={`/companies/${company.id}`}
                      className="text-xs font-semibold text-notion-text-secondary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 hover:text-notion-text"
                    >
                      詳細
                    </Link>
                  </div>
                </td>
                <td className="px-5 py-4 text-notion-text-secondary">{company.category || '-'}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={company.status} kind="company" size="sm" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1">
                    {company.tags.length > 0 ? (
                      <>
                        {company.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-notion-bg-hover px-2 py-0.5 text-xs text-notion-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                        {company.tags.length > 2 && (
                          <span className="text-xs text-notion-text-tertiary">+{company.tags.length - 2}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-notion-text-tertiary">-</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {canWrite ? (
                    <MultiSelect
                      value={company.ownerIds ?? []}
                      options={ownerOptions}
                      onChange={(next) => onOwnerChange(company.id, next)}
                      disabled={isUpdatingOwner}
                      renderValue={(selected) => renderOwnerAvatars(selected.map((option) => option.label))}
                    />
                  ) : (
                    renderOwnerAvatars(getOwnerLabels(company.ownerIds))
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default CompanyTable
