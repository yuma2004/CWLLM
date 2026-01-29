import Button from '../ui/Button'
import ActiveFilters from '../ui/ActiveFilters'
import FilterBadge from '../ui/FilterBadge'
import FormInput from '../ui/FormInput'
import FormSelect from '../ui/FormSelect'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'
import type { CompaniesFilters, User } from '../../types'

export type CompanyFiltersProps = {
  filters: CompaniesFilters
  onFiltersChange: (next: CompaniesFilters) => void
  onSubmit: (event: React.FormEvent) => void
  hasActiveFilters: boolean
  onClearFilter: (key: keyof CompaniesFilters) => void
  onClearAll: () => void
  mergedCategories: string[]
  mergedStatuses: string[]
  tagOptions: string[]
  userOptions: User[]
  searchInputRef: React.RefObject<HTMLInputElement>
}

function CompanyFilters({
  filters,
  onFiltersChange,
  onSubmit,
  hasActiveFilters,
  onClearFilter,
  onClearAll,
  mergedCategories,
  mergedStatuses,
  tagOptions,
  userOptions,
  searchInputRef,
}: CompanyFiltersProps) {
  const activeFilterCount = [filters.category, filters.status, filters.tag, filters.ownerId].filter(
    Boolean
  ).length
  const ownerLabel = filters.ownerId
    ? userOptions.find((user) => user.id === filters.ownerId)?.name ||
      userOptions.find((user) => user.id === filters.ownerId)?.email ||
      filters.ownerId
    : ''

  return (
    <div className="rounded-2xl border border-notion-border bg-notion-bg p-4 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-notion-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <FormInput
              ref={searchInputRef}
              className="pl-9"
              placeholder="企業名で検索 (/ で移動)"
              value={filters.q}
              onChange={(event) => {
                onFiltersChange({ ...filters, q: event.target.value })
              }}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-notion-border bg-notion-bg px-3 py-2 text-sm text-notion-text shadow-sm hover:bg-notion-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40"
              >
                フィルター
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-notion-accent/10 px-2 py-0.5 text-xs text-notion-accent tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
                <svg className="size-4 text-notion-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-72">
              <div className="grid gap-3">
                <FormSelect
                  value={filters.category}
                  onChange={(event) => {
                    onFiltersChange({ ...filters, category: event.target.value })
                  }}
              >
                <option value="">区分</option>
                {mergedCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </FormSelect>
              <FormSelect
                value={filters.status}
                onChange={(event) => {
                  onFiltersChange({ ...filters, status: event.target.value })
                }}
              >
                <option value="">ステータス</option>
                {mergedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FormSelect>
              <FormSelect
                value={filters.ownerId}
                onChange={(event) => {
                  onFiltersChange({ ...filters, ownerId: event.target.value })
                }}
              >
                <option value="">担当者</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </FormSelect>
              <div className="relative">
                <FormInput
                  placeholder="タグ"
                  value={filters.tag}
                  onChange={(event) => {
                    onFiltersChange({ ...filters, tag: event.target.value })
                  }}
                  list="tag-filter-options"
                />
                <datalist id="tag-filter-options">
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="rounded-full px-2 py-1 text-xs text-rose-600 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                >
                  すべて解除
                </button>
                <Button type="submit" variant="secondary" size="sm">
                  適用
                </Button>
              </div>
            </div>
            </PopoverContent>
          </Popover>
        </div>

        <ActiveFilters isActive={hasActiveFilters} className="border-t border-notion-border pt-3">
          <span className="text-xs text-notion-text-tertiary">絞り込み:</span>
          {filters.q && (
            <FilterBadge label={`企業名: ${filters.q}`} onRemove={() => onClearFilter('q')} />
          )}
          {filters.category && (
            <FilterBadge
              label={`区分: ${filters.category}`}
              onRemove={() => onClearFilter('category')}
            />
          )}
          {filters.status && (
            <FilterBadge
              label={`ステータス: ${filters.status}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.tag && (
            <FilterBadge label={`タグ: ${filters.tag}`} onRemove={() => onClearFilter('tag')} />
          )}
          {filters.ownerId && (
            <FilterBadge
              label={`担当者: ${ownerLabel}`}
              onRemove={() => onClearFilter('ownerId')}
            />
          )}
        </ActiveFilters>
      </form>
    </div>
  )
}

export default CompanyFilters
