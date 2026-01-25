import Button from '../ui/Button'
import ActiveFilters from '../ui/ActiveFilters'
import FilterBadge from '../ui/FilterBadge'
import DateInput from '../ui/DateInput'
import FormInput from '../ui/FormInput'
import FormSelect from '../ui/FormSelect'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'
import {
  TASK_STATUS_OPTIONS,
  TARGET_TYPE_OPTIONS,
  statusLabel,
  targetTypeLabel,
} from '../../constants/labels'
import type { TasksFilters as TasksFiltersType } from '../../types'

export type TaskFiltersProps = {
  filters: TasksFiltersType
  onFiltersChange: (next: TasksFiltersType) => void
  onSubmit: (event: React.FormEvent) => void
  hasActiveFilters: boolean
  onClearFilter: (key: keyof TasksFiltersType) => void
  onClearAll: () => void
  searchInputRef: React.RefObject<HTMLInputElement>
}

export function TaskFilters({
  filters,
  onFiltersChange,
  onSubmit,
  hasActiveFilters,
  onClearFilter,
  onClearAll,
  searchInputRef,
}: TaskFiltersProps) {
  const activeFilterCount = [
    filters.status,
    filters.targetType,
    filters.dueFrom,
    filters.dueTo,
  ].filter(Boolean).length

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
              name="q"
              type="search"
              autoComplete="off"
              placeholder="タスクを検索…"
              value={filters.q}
              onChange={(event) => onFiltersChange({ ...filters, q: event.target.value })}
              className="pl-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-notion-text shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40"
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
                  name="status"
                  aria-label="ステータスで絞り込み"
                  autoComplete="off"
                  value={filters.status}
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              >
                <option value="">ステータス</option>
                {TASK_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel('task', status)}
                  </option>
                ))}
              </FormSelect>
              <FormSelect
                name="targetType"
                aria-label="対象で絞り込み"
                autoComplete="off"
                value={filters.targetType}
                onChange={(e) => onFiltersChange({ ...filters, targetType: e.target.value })}
              >
                <option value="">対象</option>
                {TARGET_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {targetTypeLabel(type)}
                  </option>
                ))}
              </FormSelect>
              <DateInput
                name="dueFrom"
                aria-label="期限（開始）"
                autoComplete="off"
                value={filters.dueFrom}
                onChange={(e) => onFiltersChange({ ...filters, dueFrom: e.target.value })}
                placeholder="期限(開始)…"
              />
              <DateInput
                name="dueTo"
                aria-label="期限（終了）"
                autoComplete="off"
                value={filters.dueTo}
                onChange={(e) => onFiltersChange({ ...filters, dueTo: e.target.value })}
                placeholder="期限(終了)…"
              />
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
            <FilterBadge label={`検索: ${filters.q}`} onRemove={() => onClearFilter('q')} />
          )}
          {filters.status && (
            <FilterBadge
              label={`ステータス: ${statusLabel('task', filters.status)}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.targetType && (
            <FilterBadge
              label={`対象: ${targetTypeLabel(filters.targetType)}`}
              onRemove={() => onClearFilter('targetType')}
            />
          )}
          {filters.dueFrom && (
            <FilterBadge
              label={`期限(開始): ${filters.dueFrom}`}
              onRemove={() => onClearFilter('dueFrom')}
            />
          )}
          {filters.dueTo && (
            <FilterBadge
              label={`期限(終了): ${filters.dueTo}`}
              onRemove={() => onClearFilter('dueTo')}
            />
          )}
        </ActiveFilters>
      </form>
    </div>
  )
}
