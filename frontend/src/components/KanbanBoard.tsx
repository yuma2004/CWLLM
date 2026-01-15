import { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import { Task } from '../types'
import { statusLabel } from '../constants/labels'

type KanbanBoardProps = {
  tasks: Task[]
  canWrite: boolean
  selectedIds: string[]
  onToggleSelect: (taskId: string) => void
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>
  disabled?: boolean
}

const columns = ['todo', 'in_progress', 'done', 'cancelled'].map((key) => ({
  key,
  label: statusLabel('task', key),
}))

function KanbanBoard({
  tasks,
  canWrite,
  selectedIds,
  onToggleSelect,
  onStatusChange,
  disabled,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    }
    tasks.forEach((task) => {
      if (groups[task.status]) {
        groups[task.status].push(task)
      }
    })
    return groups
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || !canWrite) return

    const taskId = active.id as string
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // ドロップ先のカラムを特定
    const newStatus = columns.some((col) => col.key === over.id)
      ? (over.id as string)
      : null

    // ステータスが変わる場合のみ更新
    if (newStatus && newStatus !== task.status) {
      await onStatusChange(taskId, newStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 lg:grid-cols-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            id={column.key}
            label={column.label}
            tasks={tasksByStatus[column.key] || []}
            canWrite={canWrite}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            disabled={disabled}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <KanbanCard
            task={activeTask}
            canWrite={canWrite}
            isSelected={selectedIds.includes(activeTask.id)}
            onToggleSelect={() => {}}
            disabled
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
