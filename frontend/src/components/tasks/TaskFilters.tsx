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
import { TASK_STRINGS } from '../../strings/tasks'

export type TaskFiltersProps = {
  filters: TasksFiltersType
  onFiltersChange: (next: TasksFiltersType) => void
  onSubmit: (event: React.FormEvent) => void
  hasActiveFilters: boolean
  onClearFilter: (key: keyof TasksFiltersType) => void
  onClearAll: () => void
  searchInputRef: React.RefObject<HTMLInputElement>
  assigneeOptions?: Array<{ id: string; name?: string | null; email: string }>
  showAssigneeFilter?: boolean
}

export function TaskFilters({
  filters,
  onFiltersChange,
  onSubmit,
  hasActiveFilters,
  onClearFilter,
  onClearAll,
  searchInputRef,
  assigneeOptions = [],
  showAssigneeFilter = false,
}: TaskFiltersProps) {
  const activeFilterCount = [
    filters.status,
    filters.assigneeId,
    filters.targetType,
    filters.dueFrom,
    filters.dueTo,
  ].filter(Boolean).length
  const selectedAssignee = filters.assigneeId
    ? assigneeOptions.find((user) => user.id === filters.assigneeId)
    : undefined
  const assigneeLabel = selectedAssignee?.name || selectedAssignee?.email

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
              placeholder={TASK_STRINGS.labels.searchPlaceholder}
              value={filters.q}
              onChange={(event) => onFiltersChange({ ...filters, q: event.target.value })}
              className="pl-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-notion-border bg-notion-bg px-3 py-2 text-sm text-notion-text shadow-sm hover:bg-notion-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40"
              >
                {TASK_STRINGS.labels.filter}
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
                  aria-label={TASK_STRINGS.labels.statusFilterLabel}
                  autoComplete="off"
                  value={filters.status}
                  onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
                >
                  <option value="">{TASK_STRINGS.labels.statusOption}</option>
                  {TASK_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel('task', status)}
                    </option>
                  ))}
                </FormSelect>
                {showAssigneeFilter && (
                  <FormSelect
                    name="assigneeId"
                    aria-label={TASK_STRINGS.labels.assigneeFilterLabel}
                    autoComplete="off"
                    value={filters.assigneeId}
                    onChange={(e) => onFiltersChange({ ...filters, assigneeId: e.target.value })}
                  >
                    <option value="">{TASK_STRINGS.labels.assigneeOption}</option>
                    {assigneeOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </FormSelect>
                )}
                <FormSelect
                  name="targetType"
                  aria-label={TASK_STRINGS.labels.targetFilterLabel}
                  autoComplete="off"
                  value={filters.targetType}
                  onChange={(e) => onFiltersChange({ ...filters, targetType: e.target.value })}
                >
                  <option value="">{TASK_STRINGS.labels.targetOption}</option>
                  {TARGET_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {targetTypeLabel(type)}
                    </option>
                  ))}
                </FormSelect>
                <DateInput
                  name="dueFrom"
                  aria-label={TASK_STRINGS.labels.dueFrom}
                  autoComplete="off"
                  value={filters.dueFrom}
                  onChange={(e) => onFiltersChange({ ...filters, dueFrom: e.target.value })}
                  placeholder={TASK_STRINGS.labels.dueFromPlaceholder}
                />
                <DateInput
                  name="dueTo"
                  aria-label={TASK_STRINGS.labels.dueTo}
                  autoComplete="off"
                  value={filters.dueTo}
                  onChange={(e) => onFiltersChange({ ...filters, dueTo: e.target.value })}
                  placeholder={TASK_STRINGS.labels.dueToPlaceholder}
                />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="rounded-full px-2 py-1 text-xs text-rose-600 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                  >
                    {TASK_STRINGS.actions.clearAll}
                  </button>
                  <Button type="submit" variant="secondary" size="sm">
                    {TASK_STRINGS.actions.apply}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <ActiveFilters isActive={hasActiveFilters} className="border-t border-notion-border pt-3">
          <span className="text-xs text-notion-text-tertiary">{TASK_STRINGS.labels.filterSummary}</span>
          {filters.q && (
            <FilterBadge label={`${TASK_STRINGS.labels.keyword}: ${filters.q}`} onRemove={() => onClearFilter('q')} />
          )}
          {filters.status && (
            <FilterBadge
              label={`${TASK_STRINGS.labels.status}: ${statusLabel('task', filters.status)}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.assigneeId && (
            <FilterBadge
              label={`${TASK_STRINGS.labels.assignee}: ${assigneeLabel ?? filters.assigneeId}`}
              onRemove={() => onClearFilter('assigneeId')}
            />
          )}
          {filters.targetType && (
            <FilterBadge
              label={`${TASK_STRINGS.labels.target}: ${targetTypeLabel(filters.targetType)}`}
              onRemove={() => onClearFilter('targetType')}
            />
          )}
          {filters.dueFrom && (
            <FilterBadge
              label={`${TASK_STRINGS.labels.dueFrom}: ${filters.dueFrom}`}
              onRemove={() => onClearFilter('dueFrom')}
            />
          )}
          {filters.dueTo && (
            <FilterBadge
              label={`${TASK_STRINGS.labels.dueTo}: ${filters.dueTo}`}
              onRemove={() => onClearFilter('dueTo')}
            />
          )}
        </ActiveFilters>
      </form>
    </div>
  )
}
