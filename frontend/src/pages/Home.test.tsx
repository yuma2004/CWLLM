import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Home from './Home'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { server } from '../test/msw/server'
import { createDashboardResponse } from '../test/msw/factory'

const renderHomePage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </MemoryRouter>
  )

describe('ダッシュボードページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('ダッシュボードAPIの結果からタスク概要と最近更新された企業を表示する', async () => {
    // Arrange
    server.use(
      http.get('/api/dashboard', () =>
        HttpResponse.json(
          createDashboardResponse({
            overdueTasks: [
              {
                id: 'task-overdue-1',
                title: '期限切れタスク',
                status: 'todo',
                targetType: 'company',
                targetId: 'company-1',
              },
            ],
            todayTasks: [
              {
                id: 'task-today-1',
                title: '本日期限タスク',
                status: 'in_progress',
                targetType: 'project',
                targetId: 'project-1',
              },
            ],
            soonTasks: [],
            weekTasks: [],
            recentCompanies: [
              {
                id: 'company-1',
                name: '株式会社サンプル',
                status: 'active',
                updatedAt: '2026-02-01T00:00:00.000Z',
              },
            ],
          })
        )
      )
    )

    // Act
    renderHomePage()

    // Assert
    expect(await screen.findByRole('heading', { name: 'ダッシュボード' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /株式会社サンプル/ })).toHaveAttribute(
      'href',
      '/companies/company-1'
    )
    expect(screen.queryByText('タスクが見つかりません。必要に応じて新しいタスクを作成してください。')).not.toBeInTheDocument()
  })

  it('タスクと企業が未登録のときは空状態メッセージを表示する', async () => {
    // Arrange
    server.use(
      http.get('/api/dashboard', () => HttpResponse.json(createDashboardResponse()))
    )

    // Act
    renderHomePage()

    // Assert
    expect(await screen.findByText('企業がまだ登録されていません。')).toBeInTheDocument()
    expect(screen.getByText('タスクが見つかりません。必要に応じて新しいタスクを作成してください。')).toBeInTheDocument()
  })
})
