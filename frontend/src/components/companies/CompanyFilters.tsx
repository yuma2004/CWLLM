import Card from '../ui/Card'
import ActiveFilters from '../ui/ActiveFilters'
import FilterBadge from '../ui/FilterBadge'
import FormInput from '../ui/FormInput'
import FormSelect from '../ui/FormSelect'
import type { CompaniesFilters } from '../../types'

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
  searchInputRef,
}: CompanyFiltersProps) {
  return (
    <Card className="p-5">
      <form onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-7">
        <div className="relative md:col-span-3">
          <svg
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
            className="h-11 bg-slate-50/70 pl-10 pr-4"
            placeholder="企業名で検索 (/ で移動)"
            value={filters.q}
            onChange={(event) => {
              onFiltersChange({ ...filters, q: event.target.value })
            }}
          />
        </div>
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
        <button
          type="submit"
          className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white  hover:bg-slate-800"
        >
          検索
        </button>
      </div>

      {/* Active Filters */}
      <ActiveFilters isActive={hasActiveFilters}>
          <span className="text-xs text-slate-500">絞り込み:</span>
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
              label={`担当者: ${filters.ownerId}`}
              onRemove={() => onClearFilter('ownerId')}
            />
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-rose-600 hover:text-rose-700"
          >
            すべて解除
          </button>
      </ActiveFilters>
      </form>
    </Card>
  )
}

export default CompanyFilters
