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
import { Task, User } from '../types'
import { statusLabel } from '../constants/labels'

type KanbanBoardProps = {
  tasks: Task[]
  canWrite: boolean
  selectedIds: string[]
  onToggleSelect: (taskId: string) => void
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>
  onAssigneeChange: (taskId: string, assigneeId: string) => void
  disabled?: boolean
  userOptions: User[]
}

const columns = ['todo', 'in_progress', 'done', 'cancelled'].map((key) => ({
  key,
  label: statusLabel('task', key),
}))
const columnKeys = new Set(columns.map((column) => column.key))

function KanbanBoard({
  tasks,
  canWrite,
  selectedIds,
  onToggleSelect,
  onStatusChange,
  onAssigneeChange,
  disabled,
  userOptions,
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

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
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
    const task = tasksById.get(active.id as string)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || !canWrite) return

    const taskId = active.id as string
    const task = tasksById.get(taskId)
    if (!task) return

    // ドロップ先のカラムを特定

    const overId = over.id as string
    const newStatus = columnKeys.has(overId) ? overId : null

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
            selectedIdSet={selectedIdSet}
            onToggleSelect={onToggleSelect}
            onAssigneeChange={onAssigneeChange}
            userOptions={userOptions}
            disabled={disabled}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <KanbanCard
            task={activeTask}
            canWrite={false}
            isSelected={selectedIdSet.has(activeTask.id)}
            onToggleSelect={() => {}}
            onAssigneeChange={() => {}}
            userOptions={userOptions}
            disabled
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
