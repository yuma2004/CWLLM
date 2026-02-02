import DateInput from '../ui/DateInput'
import FormSelect from '../ui/FormSelect'
import { TASK_STATUS_OPTIONS, statusLabel } from '../../constants/labels'
import { TASK_STRINGS } from '../../strings/tasks'

export type TaskBulkActionsProps = {
  selectedIds: string[]
  allSelected: boolean
  onToggleSelectAll: () => void
  bulkStatus: string
  onBulkStatusChange: (value: string) => void
  bulkDueDate: string
  onBulkDueDateChange: (value: string) => void
  clearBulkDueDate: boolean
  onClearBulkDueDateChange: (value: boolean) => void
  onBulkUpdate: () => void
  isBulkUpdating: boolean
}

export function TaskBulkActions({
  selectedIds,
  allSelected,
  onToggleSelectAll,
  bulkStatus,
  onBulkStatusChange,
  bulkDueDate,
  onBulkDueDateChange,
  clearBulkDueDate,
  onClearBulkDueDateChange,
  onBulkUpdate,
  isBulkUpdating,
}: TaskBulkActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center safe-area-bottom">
      <div className="flex flex-wrap items-center gap-3 rounded-full bg-slate-900 px-4 py-3 text-xs text-white shadow-lg">
        <label className="flex items-center gap-2 text-white/80">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            name="selectAll"
            className="size-4 rounded border-notion-border accent-notion-accent focus-visible:ring-2 focus-visible:ring-notion-accent/40"
            disabled={isBulkUpdating}
          />
          {TASK_STRINGS.actions.selectAll}
        </label>
        <span className="text-white/80 tabular-nums">
          {selectedIds.length}
          {TASK_STRINGS.labels.selectedCountSuffix}
        </span>
        <FormSelect
          name="bulkStatus"
          aria-label={TASK_STRINGS.bulk.statusLabel}
          autoComplete="off"
          value={bulkStatus}
          onChange={(e) => onBulkStatusChange(e.target.value)}
          className="w-36 text-xs"
          noContainer
        >
          <option value="">{TASK_STRINGS.labels.statusOption}</option>
          {TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel('task', status)}
            </option>
          ))}
        </FormSelect>
        <DateInput
          name="bulkDueDate"
          aria-label={TASK_STRINGS.bulk.dueDateLabel}
          autoComplete="off"
          value={bulkDueDate}
          onChange={(e) => onBulkDueDateChange(e.target.value)}
          placeholder={TASK_STRINGS.bulk.dueDatePlaceholder}
          disabled={clearBulkDueDate}
          className="w-32 text-xs"
          noContainer
        />
        <label className="flex items-center gap-2 text-white/80">
          <input
            type="checkbox"
            checked={clearBulkDueDate}
            onChange={(e) => onClearBulkDueDateChange(e.target.checked)}
            name="clearBulkDueDate"
            className="size-4 rounded border-notion-border accent-notion-accent focus-visible:ring-2 focus-visible:ring-notion-accent/40"
          />
          {TASK_STRINGS.bulk.clearDueDateLabel}
        </label>
        <button
          type="button"
          onClick={onBulkUpdate}
          disabled={isBulkUpdating || selectedIds.length === 0}
          className="rounded-full bg-notion-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-notion-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40 disabled:bg-slate-600"
        >
          {TASK_STRINGS.bulk.submitLabel}
        </button>
      </div>
    </div>
  )
}
