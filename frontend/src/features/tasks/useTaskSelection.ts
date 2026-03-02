import { useEffect, useState } from 'react'
import { toggleSelectAllTaskIds, toggleTaskSelection } from './state'

type TaskIdItem = { id: string }

export const useTaskSelection = (tasks: TaskIdItem[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkDueDate, setBulkDueDate] = useState('')
  const [clearBulkDueDate, setClearBulkDueDate] = useState(false)

  useEffect(() => {
    setSelectedIds([])
  }, [tasks])

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length

  const toggleSelectAll = () => {
    setSelectedIds(toggleSelectAllTaskIds(allSelected, tasks))
  }

  const toggleSelected = (taskId: string) => {
    setSelectedIds((prev) => toggleTaskSelection(prev, taskId))
  }

  const resetBulkState = () => {
    setSelectedIds([])
    setBulkStatus('')
    setBulkDueDate('')
    setClearBulkDueDate(false)
  }

  return {
    selectedIds,
    setSelectedIds,
    bulkStatus,
    setBulkStatus,
    bulkDueDate,
    setBulkDueDate,
    clearBulkDueDate,
    setClearBulkDueDate,
    allSelected,
    toggleSelectAll,
    toggleSelected,
    resetBulkState,
  }
}
