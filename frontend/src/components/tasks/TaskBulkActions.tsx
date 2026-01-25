import DateInput from '../ui/DateInput'
import FormSelect from '../ui/FormSelect'
import { TASK_STATUS_OPTIONS, statusLabel } from '../../constants/labels'

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
            className="size-4 rounded border-slate-300 accent-notion-accent focus-visible:ring-2 focus-visible:ring-notion-accent/40"
            disabled={isBulkUpdating}
          />
          全選択
        </label>
        <span className="text-white/80 tabular-nums">{selectedIds.length}件選択中</span>
        <FormSelect
          name="bulkStatus"
          aria-label="ステータスを一括変更"
          autoComplete="off"
          value={bulkStatus}
          onChange={(e) => onBulkStatusChange(e.target.value)}
          className="w-36 text-xs"
          noContainer
        >
          <option value="">ステータス</option>
          {TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel('task', status)}
            </option>
          ))}
        </FormSelect>
        <DateInput
          name="bulkDueDate"
          aria-label="期限を一括変更"
          autoComplete="off"
          value={bulkDueDate}
          onChange={(e) => onBulkDueDateChange(e.target.value)}
          placeholder="期限…"
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
            className="size-4 rounded border-slate-300 accent-notion-accent focus-visible:ring-2 focus-visible:ring-notion-accent/40"
          />
          期限をクリア
        </label>
        <button
          type="button"
          onClick={onBulkUpdate}
          disabled={isBulkUpdating || selectedIds.length === 0}
          className="rounded-full bg-notion-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-notion-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40 disabled:bg-slate-600"
        >
          一括更新
        </button>
      </div>
    </div>
  )
}
