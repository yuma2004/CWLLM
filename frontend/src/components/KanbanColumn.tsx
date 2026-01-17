import { useDroppable } from '@dnd-kit/core'
import KanbanCard from './KanbanCard'
import { Task } from '../types'
import { cn } from '../lib/cn'

type KanbanColumnProps = {
  id: string
  label: string
  tasks: Task[]
  canWrite: boolean
  selectedIdSet: Set<string>
  onToggleSelect: (taskId: string) => void
  disabled?: boolean
}

function KanbanColumn({
  id,
  label,
  tasks,
  canWrite,
  selectedIdSet,
  onToggleSelect,
  disabled,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border bg-slate-50/50 p-4 shadow-sm',
        isOver ? 'border-sky-300 bg-sky-50/50' : 'border-slate-200'
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-slate-600">
          {label}
        </span>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              canWrite={canWrite}
              isSelected={selectedIdSet.has(task.id)}
              onToggleSelect={() => onToggleSelect(task.id)}
              disabled={disabled}
            />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-4">
            <span className="text-xs text-slate-400">タスクなし</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
