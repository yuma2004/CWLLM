import KanbanBoard from '../KanbanBoard'
import type { Task } from '../../types'

export type TaskKanbanProps = {
  tasks: Task[]
  canWrite: boolean
  selectedIds: string[]
  onToggleSelect: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => Promise<void>
  disabled: boolean
}

export function TaskKanban({ tasks, canWrite, selectedIds, onToggleSelect, onStatusChange, disabled }: TaskKanbanProps) {
  return (
    <KanbanBoard
      tasks={tasks}
      canWrite={canWrite}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onStatusChange={onStatusChange}
      disabled={disabled}
    />
  )
}
