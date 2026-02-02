import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { Task, User } from '../types'
import { formatDate } from '../utils/date'
import { getTargetPath } from '../utils/routes'
import { cn } from '../lib/cn'
import FormSelect from './ui/FormSelect'
import StatusBadge from './ui/StatusBadge'

type KanbanCardProps = {
  task: Task
  canWrite: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onAssigneeChange: (assigneeId: string) => void
  userOptions: User[]
  disabled?: boolean
}

function KanbanCard({
  task,
  canWrite,
  isSelected,
  onToggleSelect,
  onAssigneeChange,
  userOptions,
  disabled,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    disabled: !canWrite || disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm',
        isDragging ? 'border-sky-300 shadow-md opacity-90' : 'border-slate-200 hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            to={`/tasks/${task.id}`}
            className="block truncate text-sm font-semibold text-slate-900 hover:text-sky-600"
            onClick={(e) => e.stopPropagation()}
          >
            {task.title}
          </Link>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex items-start gap-2">
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label="drag"
            className={cn(
              'rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500 shadow-sm',
              canWrite && !disabled
                ? 'cursor-grab hover:border-slate-300 active:cursor-grabbing'
                : 'cursor-not-allowed opacity-50'
            )}
            disabled={!canWrite || disabled}
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            移動
          </button>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            className="mt-0.5 rounded border-slate-300"
            disabled={disabled}
            aria-label={`${task.title}を選択`}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <StatusBadge status={task.status} kind="task" size="sm" />
        <span>期日: {formatDate(task.dueDate)}</span>
      </div>
      <div className="mt-1">
        <Link
          to={getTargetPath(task.targetType, task.targetId)}
          className="truncate text-xs font-medium text-slate-600 hover:text-sky-600"
          onClick={(e) => e.stopPropagation()}
        >
          {task.target?.name || task.targetId}
        </Link>
      </div>
      <div className="mt-2">
        {canWrite ? (
          <FormSelect
            value={task.assigneeId ?? ''}
            onChange={(event) => onAssigneeChange(event.target.value)}
            className="h-7 rounded-full text-[11px]"
            disabled={disabled}
          >
            <option value="">未設定</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </FormSelect>
        ) : (
          <div className="text-xs text-slate-400 whitespace-normal break-words">
            担当: {task.assignee?.name || task.assignee?.email || task.assigneeId || '-'}
          </div>
        )}
      </div>
    </div>
  )
}

export default KanbanCard