import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState'
import DateInput from '../ui/DateInput'
import FormSelect from '../ui/FormSelect'
import StatusBadge from '../ui/StatusBadge'
import { formatDate, formatDateInput } from '../../utils/date'
import { getTargetPath } from '../../utils/routes'
import {
  TASK_STATUS_OPTIONS,
  statusLabel,
  targetTypeLabel,
} from '../../constants/labels'
import type { Task, User } from '../../types'

export type TaskTableProps = {
  tasks: Task[]
  selectedIds: string[]
  allSelected: boolean
  onToggleSelectAll: () => void
  onToggleSelected: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onAssigneeChange: (taskId: string, assigneeId: string) => void
  onDelete: (task: Task) => void
  canWrite: boolean
  isBulkUpdating: boolean
  userOptions: User[]
  emptyStateAction?: React.ReactNode
  emptyStateDescription?: string
}

export function TaskTable({
  tasks,
  selectedIds,
  allSelected,
  onToggleSelectAll,
  onToggleSelected,
  onStatusChange,
  onDueDateChange,
  onAssigneeChange,
  onDelete,
  canWrite,
  isBulkUpdating,
  userOptions,
  emptyStateAction,
  emptyStateDescription,
}: TaskTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase whitespace-nowrap text-slate-500">
          <tr>
            <th className="px-4 py-3">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  name="select-all"
                  aria-label="すべてのタスクを選択"
                  className="size-4 rounded border-slate-300 accent-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500/40"
                  disabled={isBulkUpdating}
                />
                <span className="sr-only">すべて選択</span>
              </label>
            </th>
            <th className="px-4 py-3">タイトル</th>
            <th className="px-4 py-3">ステータス</th>
            <th className="px-4 py-3">担当者</th>
            <th className="px-4 py-3">対象</th>
            <th className="px-4 py-3">期限</th>
            <th className="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <EmptyState
                  message="タスクが見つかりません"
                  description={emptyStateDescription}
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  }
                  action={emptyStateAction}
                />
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="group hover:bg-slate-50/80">
                <td className="px-4 py-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(task.id)}
                      onChange={() => onToggleSelected(task.id)}
                      name={`select-${task.id}`}
                      aria-label={`${task.title} を選択`}
                      className="size-4 rounded border-slate-300 accent-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500/40"
                      disabled={isBulkUpdating}
                    />
                    <span className="sr-only">{`${task.title} を選択`}</span>
                  </label>
                </td>
                <td className="px-4 py-4 min-w-0">
                  <div className="min-w-0">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="block truncate font-semibold text-slate-900 hover:text-sky-600"
                    >
                      {task.title}
                    </Link>
                    {task.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {task.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {canWrite ? (
                    <FormSelect
                      name={`status-${task.id}`}
                      aria-label={`${task.title} のステータス`}
                      autoComplete="off"
                      className="w-auto rounded-full px-3 py-1 text-xs"
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value)}
                    >
                      {TASK_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel('task', status)}
                        </option>
                      ))}
                    </FormSelect>
                  ) : (
                    <StatusBadge status={task.status} kind="task" size="sm" />
                  )}
                </td>
                <td className="px-4 py-4">
                  {canWrite ? (
                    <FormSelect
                      name={`assignee-${task.id}`}
                      aria-label={`${task.title} の担当者`}
                      autoComplete="off"
                      className="w-auto rounded-full px-3 py-1 text-xs"
                      value={task.assigneeId ?? ''}
                      onChange={(e) => onAssigneeChange(task.id, e.target.value)}
                      disabled={isBulkUpdating}
                    >
                      <option value="">未割当</option>
                      {userOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </FormSelect>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {task.assignee?.name || task.assignee?.email || task.assigneeId || '-'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 min-w-0">
                  <Link
                    to={getTargetPath(task.targetType, task.targetId)}
                    className="inline-flex min-w-0 flex-col items-start gap-1 text-slate-600 hover:text-sky-600"
                  >
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                      {targetTypeLabel(task.targetType)}
                    </span>
                    <span className="truncate text-xs text-slate-500">
                      {task.target?.name || task.targetId}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4 text-slate-600 tabular-nums">
                  {canWrite ? (
                    <DateInput
                      name={`dueDate-${task.id}`}
                      aria-label={`${task.title} の期限`}
                      autoComplete="off"
                      className="w-auto rounded border border-slate-200 px-2 py-1 text-xs"
                      value={task.dueDate ? formatDateInput(task.dueDate) : ''}
                      onChange={(e) => onDueDateChange(task.id, e.target.value)}
                      placeholder="期限…"
                    />
                  ) : (
                    formatDate(task.dueDate)
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={getTargetPath(task.targetType, task.targetId)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      詳細
                    </Link>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => onDelete(task)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
