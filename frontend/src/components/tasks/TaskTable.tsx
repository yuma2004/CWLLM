import { Link } from 'react-router-dom'
import EmptyState from '../ui/EmptyState'
import DateInput from '../ui/DateInput'
import FormSelect from '../ui/FormSelect'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover'
import StatusBadge from '../ui/StatusBadge'
import { formatDate, formatDateInput } from '../../utils/date'
import { getTargetPath } from '../../utils/routes'
import { cn } from '../../lib/cn'
import {
  TASK_STATUS_OPTIONS,
  statusLabel,
  targetTypeLabel,
} from '../../constants/labels'
import type { Task, User } from '../../types'
import { TASK_STRINGS } from '../../strings/tasks'

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
    <div className="overflow-x-auto rounded-2xl border border-notion-border bg-notion-bg shadow-sm">
      <table className="min-w-full divide-y divide-notion-border text-sm text-notion-text-secondary">
        <thead className="sticky top-0 z-10 bg-notion-bg-secondary text-left text-xs font-semibold uppercase whitespace-nowrap text-notion-text-tertiary">
          <tr>
            <th className="px-4 py-3">
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  name="select-all"
                  aria-label={TASK_STRINGS.actions.selectAll}
                  className="size-4 rounded border-notion-border accent-notion-accent focus-visible:ring-2 focus-visible:ring-notion-accent/40"
                  disabled={isBulkUpdating}
                />
                {TASK_STRINGS.labels.section}
              </label>
            </th>
            <th className="px-4 py-3">{TASK_STRINGS.labels.status}</th>
            <th className="px-4 py-3">{TASK_STRINGS.labels.assignee}</th>
            <th className="px-4 py-3">{TASK_STRINGS.labels.dueDate}</th>
            <th className="px-4 py-3 text-right">{TASK_STRINGS.labels.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-notion-border bg-notion-bg">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center">
                <EmptyState
                  message={TASK_STRINGS.messages.emptyList}
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
              <tr key={task.id} className="group hover:bg-notion-bg-hover">
                <td className="px-4 py-4 min-w-0">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'pt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
                        selectedIds.includes(task.id) && 'opacity-100'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(task.id)}
                        onChange={() => onToggleSelected(task.id)}
                        name={`select-${task.id}`}
                        aria-label={`${task.title} ${TASK_STRINGS.labels.selectTaskSuffix}`}
                        className="size-4 rounded border-notion-border accent-notion-accent focus-visible:ring-2 focus-visible:ring-notion-accent/40"
                        disabled={isBulkUpdating}
                      />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="block truncate font-semibold text-notion-text hover:text-notion-accent"
                      >
                        {task.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-notion-text-secondary">
                        <span className="rounded bg-notion-bg-hover px-2 py-0.5">
                          {targetTypeLabel(task.targetType)}
                        </span>
                        <Link
                          to={getTargetPath(task.targetType, task.targetId)}
                          className="truncate hover:text-notion-text"
                        >
                          {task.target?.name || task.targetId}
                        </Link>
                      </div>
                      {task.description && (
                        <div className="mt-1 line-clamp-1 text-xs text-notion-text-tertiary">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {canWrite ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-notion-bg-hover px-2 py-1 text-xs text-notion-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40"
                        >
                          {statusLabel('task', task.status)}
                          <svg className="size-3 text-notion-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" sideOffset={6} className="w-64">
                        <FormSelect
                          label={TASK_STRINGS.labels.status}
                          name={`status-${task.id}`}
                          aria-label={`${task.title} ${TASK_STRINGS.labels.statusForTaskSuffix}`}
                          autoComplete="off"
                          value={task.status}
                          onChange={(e) => onStatusChange(task.id, e.target.value)}
                        >
                          {TASK_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel('task', status)}
                            </option>
                          ))}
                        </FormSelect>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <StatusBadge status={task.status} kind="task" size="sm" />
                  )}
                </td>
                <td className="px-4 py-4">
                  {canWrite ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex max-w-[14rem] flex-wrap items-center gap-2 rounded-full bg-notion-bg-hover px-2 py-1 text-left text-xs text-notion-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40"
                        >
                          <span className="min-w-0 whitespace-normal break-words">
                            {task.assignee?.name || task.assignee?.email || task.assigneeId || TASK_STRINGS.labels.unassigned}
                          </span>
                          <svg className="size-3 shrink-0 text-notion-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" sideOffset={6} className="w-64">
                        <FormSelect
                          label={TASK_STRINGS.labels.assignee}
                          name={`assignee-${task.id}`}
                          aria-label={`${task.title} ${TASK_STRINGS.labels.assigneeForTaskSuffix}`}
                          autoComplete="off"
                          value={task.assigneeId ?? ''}
                          onChange={(e) => onAssigneeChange(task.id, e.target.value)}
                          disabled={isBulkUpdating}
                        >
                          <option value="">{TASK_STRINGS.labels.unassigned}</option>
                          {userOptions.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email}
                            </option>
                          ))}
                        </FormSelect>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-xs text-notion-text-secondary whitespace-normal break-words">
                      {task.assignee?.name || task.assignee?.email || task.assigneeId || TASK_STRINGS.labels.unassigned}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-notion-text tabular-nums">
                  {canWrite ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full bg-notion-bg-hover px-2 py-1 text-xs text-notion-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40"
                        >
                          {task.dueDate ? formatDate(task.dueDate) : TASK_STRINGS.labels.unassigned}
                          <svg className="size-3 text-notion-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" sideOffset={6} className="w-64">
                        <DateInput
                          label={TASK_STRINGS.labels.dueDate}
                          name={`dueDate-${task.id}`}
                          aria-label={`${task.title} ${TASK_STRINGS.labels.dueDateForTaskSuffix}`}
                          autoComplete="off"
                          value={task.dueDate ? formatDateInput(task.dueDate) : ''}
                          onChange={(e) => onDueDateChange(task.id, e.target.value)}
                          placeholder={TASK_STRINGS.labels.dueDatePlaceholder}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    formatDate(task.dueDate)
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="inline-flex items-center gap-2 text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <Link
                      to={getTargetPath(task.targetType, task.targetId)}
                      className="font-semibold text-notion-text-secondary hover:text-notion-text"
                    >
                      {TASK_STRINGS.labels.details}
                    </Link>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => onDelete(task)}
                        className="font-semibold text-rose-600 hover:text-rose-700"
                      >
                        {TASK_STRINGS.confirm.deleteConfirmLabel}
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
