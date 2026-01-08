import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { Task } from '../types'
import { formatDate } from '../utils/date'
import { getTargetPath } from '../utils/routes'

type KanbanCardProps = {
  task: Task
  canWrite: boolean
  isSelected: boolean
  onToggleSelect: () => void
  disabled?: boolean
}

function KanbanCard({
  task,
  canWrite,
  isSelected,
  onToggleSelect,
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
      className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow ${
        isDragging
          ? 'border-sky-300 shadow-lg opacity-90'
          : 'border-slate-200 hover:shadow-md'
      }`}
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
            className={`rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500 shadow-sm transition ${
              canWrite && !disabled
                ? 'cursor-grab hover:border-slate-300 active:cursor-grabbing'
                : 'cursor-not-allowed opacity-50'
            }`}
            disabled={!canWrite || disabled}
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            ⠿
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
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>期日: {formatDate(task.dueDate)}</span>
        <Link
          to={getTargetPath(task.targetType, task.targetId)}
          className="truncate font-medium text-slate-600 hover:text-sky-600"
          onClick={(e) => e.stopPropagation()}
        >
          {task.target?.name || task.targetId}
        </Link>
      </div>
      {task.assignee && (
        <div className="mt-1 truncate text-xs text-slate-400">
          担当: {task.assignee.email}
        </div>
      )}
    </div>
  )
}

export default KanbanCard
