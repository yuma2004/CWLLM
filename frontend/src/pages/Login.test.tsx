import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { useAuth } from '../contexts/AuthContext'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

describe('Login page', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      login: vi.fn(async () => {}),
      logout: vi.fn(async () => {}),
      isLoading: false,
      isAuthenticated: false,
    })
  })

  it('toggles password visibility', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'パスワードを表示' }))
    expect(passwordInput.type).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: 'パスワードを隠す' }))
    expect(passwordInput.type).toBe('password')
  })

  it('clears auth error while user edits fields', async () => {
    const loginMock = vi.fn(async () => {
      throw new Error('unauthorized')
    })
    mockUseAuth.mockReturnValue({
      user: null,
      login: loginMock,
      logout: vi.fn(async () => {}),
      isLoading: false,
      isAuthenticated: false,
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(
        screen.getByText('メールアドレスまたはパスワードが正しくありません。')
      ).toBeInTheDocument()
    })

    fireEvent.change(emailInput, { target: { value: 'admin2@example.com' } })
    expect(
      screen.queryByText('メールアドレスまたはパスワードが正しくありません。')
    ).not.toBeInTheDocument()
  })
})
