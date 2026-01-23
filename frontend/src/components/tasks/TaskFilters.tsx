import Button from '../ui/Button'
import Card from '../ui/Card'
import ActiveFilters from '../ui/ActiveFilters'
import FilterBadge from '../ui/FilterBadge'
import DateInput from '../ui/DateInput'
import FormSelect from '../ui/FormSelect'
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
  searchInputRef: React.RefObject<HTMLSelectElement>
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
  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
        <FormSelect
          ref={searchInputRef}
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
          value={filters.dueFrom}
          onChange={(e) => onFiltersChange({ ...filters, dueFrom: e.target.value })}
          placeholder="期限(開始)"
        />
        <DateInput
          value={filters.dueTo}
          onChange={(e) => onFiltersChange({ ...filters, dueTo: e.target.value })}
          placeholder="期限(終了)"
        />
        <Button type="submit" className="w-full md:w-auto">
          検索
        </Button>
        </div>

        {/* Active Filters */}
        <ActiveFilters isActive={hasActiveFilters} className="border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">絞り込み:</span>
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
