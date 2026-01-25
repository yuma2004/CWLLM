import KanbanBoard from '../KanbanBoard'
import type { Task, User } from '../../types'

export type TaskKanbanProps = {
  tasks: Task[]
  canWrite: boolean
  selectedIds: string[]
  onToggleSelect: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => Promise<void>
  onAssigneeChange: (taskId: string, assigneeId: string) => void
  disabled: boolean
  userOptions: User[]
}

export function TaskKanban({
  tasks,
  canWrite,
  selectedIds,
  onToggleSelect,
  onStatusChange,
  onAssigneeChange,
  disabled,
  userOptions,
}: TaskKanbanProps) {
  return (
    <KanbanBoard
      tasks={tasks}
      canWrite={canWrite}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onStatusChange={onStatusChange}
      onAssigneeChange={onAssigneeChange}
      disabled={disabled}
      userOptions={userOptions}
    />
  )
}
