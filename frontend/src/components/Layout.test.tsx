import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Layout from './Layout'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { createUser } from '../test/msw/factory'
import { server } from '../test/msw/server'

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route
            path="*"
            element={(
              <Layout>
                <div>メインコンテンツ</div>
              </Layout>
            )}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

const setAuthRole = (role: string) => {
  server.use(
    http.get('/api/auth/me', () =>
      HttpResponse.json({
        user: createUser({ role }),
      })
    )
  )
}

describe('レイアウトコンポーネント', () => {
  beforeEach(() => {
    setAuthToken('test-token')
    window.localStorage.clear()
  })

  afterEach(() => {
    clearAuthToken()
    window.localStorage.clear()
  })

  it('ローカルストレージの状態でサイドバー開閉を復元し変更を保存する', async () => {
    const user = userEvent.setup()
    setAuthRole('admin')
    window.localStorage.setItem('sidebarOpen', 'false')
    renderLayout()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'サイドバーを開く' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'サイドバーを開く' }))
    await waitFor(() => {
      expect(window.localStorage.getItem('sidebarOpen')).toBe('true')
    })

    await user.click(screen.getByRole('button', { name: 'サイドバーを閉じる' }))
    await waitFor(() => {
      expect(window.localStorage.getItem('sidebarOpen')).toBe('false')
    })
  })

  it('閲覧専用ユーザーには設定メニューを表示しない', async () => {
    setAuthRole('viewer')
    renderLayout()

    await screen.findByRole('link', { name: 'ダッシュボード' })
    expect(screen.queryByRole('link', { name: 'アカウント作成' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Chatwork設定' })).not.toBeInTheDocument()
  })

  it('管理者ユーザーには設定メニューを表示する', async () => {
    setAuthRole('admin')
    renderLayout()

    expect(await screen.findByRole('link', { name: 'アカウント作成' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chatwork設定' })).toBeInTheDocument()
  })
})
