import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import ProtectedRoute from './ProtectedRoute'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { createUser } from '../test/msw/factory'
import { server } from '../test/msw/server'

const renderProtectedRoute = (allowedRoles?: string[]) =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>ログインページ</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div>秘密ページ</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

describe('保護ルート制御', () => {
  beforeEach(() => {
    clearAuthToken()
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('未認証ユーザーはログインページへリダイレクトする', async () => {
    renderProtectedRoute()

    expect(await screen.findByText('ログインページ')).toBeInTheDocument()
  })

  it('権限不足の場合はアクセス不可メッセージを表示する', async () => {
    setAuthToken('employee-token')
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          user: createUser({
            id: 'employee-1',
            email: 'employee@example.com',
            role: 'employee',
            name: '担当者',
          }),
        })
      )
    )

    renderProtectedRoute(['admin'])

    expect(await screen.findByText('アクセス権限がありません')).toBeInTheDocument()
  })

  it('認証済みかつ許可ロールの場合は子要素を表示する', async () => {
    setAuthToken('admin-token')
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          user: createUser({
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'admin',
            name: '管理者',
          }),
        })
      )
    )

    renderProtectedRoute(['admin'])

    expect(await screen.findByText('秘密ページ')).toBeInTheDocument()
  })
})
