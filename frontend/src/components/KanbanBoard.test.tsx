import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import KanbanBoard from './KanbanBoard'
import { Task } from '../types'

const baseTask: Task = {
  id: 'task-1',
  title: 'テストタスク',
  status: 'todo',
  targetType: 'company',
  targetId: 'company-1',
  dueDate: '2024-01-01',
}

describe('KanbanBoard', () => {
  it('renders a drag handle for each card', () => {
    render(
      <MemoryRouter>
        <KanbanBoard
          tasks={[baseTask]}
          canWrite
          selectedIds={[]}
          onToggleSelect={vi.fn()}
          onStatusChange={vi.fn().mockResolvedValue(undefined)}
          onAssigneeChange={vi.fn()}
          userOptions={[]}
        />
      </MemoryRouter>
    )

    expect(screen.getByLabelText('drag')).toBeInTheDocument()
  })
})
