import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Login from './Login'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken } from '../lib/authToken'
import { server } from '../test/msw/server'

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

describe('ログインページ', () => {
  beforeEach(() => {
    clearAuthToken()
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('表示切り替えボタンでパスワード入力の表示形式を切り替えられる', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    await user.click(screen.getByRole('button', { name: '入力内容を表示' }))
    expect(passwordInput.type).toBe('text')

    await user.click(screen.getByRole('button', { name: '入力内容を隠す' }))
    expect(passwordInput.type).toBe('password')
  })

  it('認証エラー表示中に入力を変更するとエラーをクリアする', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ error: 'unauthorized' }, { status: 401 })
      )
    )

    renderLoginPage()

    await user.type(screen.getByLabelText('メールアドレス'), 'admin@example.com')
    await user.type(screen.getByLabelText('パスワード'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(
        screen.getByText('メールアドレスまたはパスワードが正しくありません。')
      ).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('メールアドレス'), '2')

    expect(
      screen.queryByText('メールアドレスまたはパスワードが正しくありません。')
    ).not.toBeInTheDocument()
  })
})
