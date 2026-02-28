import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { AuthProvider, useAuth } from './AuthContext'
import { clearAuthToken, getAuthToken, setAuthToken } from '../lib/authToken'
import { createUser } from '../test/msw/factory'
import { server } from '../test/msw/server'

function AuthProbe() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'anonymous'}</div>
      <div data-testid="auth-loading">{isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="auth-email">{user?.email ?? ''}</div>
      <button
        type="button"
        onClick={() => {
          void login('login@example.com', 'password123')
        }}
      >
        ログイン実行
      </button>
      <button
        type="button"
        onClick={() => {
          void logout()
        }}
      >
        ログアウト実行
      </button>
    </div>
  )
}

const renderAuthProvider = () =>
  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  )

describe('認証コンテキスト', () => {
  beforeEach(() => {
    clearAuthToken()
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('保存済みトークンがある場合に認証情報を復元する', async () => {
    // Arrange
    setAuthToken('persisted-token')
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json({
          user: createUser({
            id: 'user-persisted',
            email: 'persisted@example.com',
            role: 'admin',
            name: 'Persisted User',
          }),
        })
      })
    )

    // Act
    renderAuthProvider()

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })
    expect(screen.getByTestId('auth-email')).toHaveTextContent('persisted@example.com')
    expect(getAuthToken()).toBe('persisted-token')
  })

  it('認証確認が401の場合はトークンを破棄して未認証に戻す', async () => {
    // Arrange
    setAuthToken('stale-token')
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json({ error: 'unauthorized' }, { status: 401 })
      })
    )

    // Act
    renderAuthProvider()

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous')
    })
    expect(getAuthToken()).toBeNull()
  })

  it('login成功時にトークン保存とユーザー反映を行う', async () => {
    // Arrange
    const user = userEvent.setup()
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({
          token: 'login-token',
          user: createUser({
            id: 'user-login',
            email: 'login@example.com',
            role: 'admin',
            name: 'Login User',
          }),
        })
      }),
      http.get('/api/auth/me', () => {
        return HttpResponse.json({
          user: createUser({
            id: 'user-login',
            email: 'login@example.com',
            role: 'admin',
            name: 'Login User',
          }),
        })
      })
    )
    renderAuthProvider()

    // Act
    await user.click(screen.getByRole('button', { name: 'ログイン実行' }))

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })
    expect(screen.getByTestId('auth-email')).toHaveTextContent('login@example.com')
    expect(getAuthToken()).toBe('login-token')
  })

  it('logout APIが失敗してもローカル認証状態をクリアする', async () => {
    // Arrange
    const user = userEvent.setup()
    setAuthToken('logout-token')
    server.use(
      http.get('/api/auth/me', () => {
        return HttpResponse.json({
          user: createUser({
            id: 'user-logout',
            email: 'logout@example.com',
            role: 'admin',
            name: 'Logout User',
          }),
        })
      }),
      http.post('/api/auth/logout', () => {
        return HttpResponse.json({ error: 'failed' }, { status: 500 })
      })
    )
    renderAuthProvider()
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })

    // Act
    await user.click(screen.getByRole('button', { name: 'ログアウト実行' }))

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous')
    })
    expect(screen.getByTestId('auth-email')).toHaveTextContent('')
    expect(getAuthToken()).toBeNull()
  })
})
