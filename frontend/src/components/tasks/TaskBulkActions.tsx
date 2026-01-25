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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            name="selectAll"
            className="rounded border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
            disabled={isBulkUpdating}
          />
          全選択
        </label>
        <span>{selectedIds.length}件選択中</span>
        <FormSelect
          name="bulkStatus"
          aria-label="ステータスを一括変更"
          autoComplete="off"
          value={bulkStatus}
          onChange={(e) => onBulkStatusChange(e.target.value)}
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
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={clearBulkDueDate}
            onChange={(e) => onClearBulkDueDateChange(e.target.checked)}
            name="clearBulkDueDate"
            className="rounded border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          />
          期限をクリア
        </label>
        <button
          type="button"
          onClick={onBulkUpdate}
          disabled={isBulkUpdating || selectedIds.length === 0}
          className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 disabled:bg-slate-300"
        >
          一括更新
        </button>
      </div>
    </div>
  )
}
