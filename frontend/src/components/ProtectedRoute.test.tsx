import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const buildAuthState = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
  ...overrides,
})

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('redirects unauthenticated users to login', () => {
    mockUseAuth.mockReturnValue(buildAuthState({ isAuthenticated: false }))

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>secret</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('shows forbidden message when role is not allowed', () => {
    mockUseAuth.mockReturnValue(
      buildAuthState({
        isAuthenticated: true,
        user: { id: '1', email: 'employee@example.com', role: 'employee' },
      })
    )

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div>secret</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument()
  })

  it('renders children when authenticated and authorized', () => {
    mockUseAuth.mockReturnValue(
      buildAuthState({
        isAuthenticated: true,
        user: { id: '2', email: 'admin@example.com', role: 'admin' },
      })
    )

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div>secret</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('secret')).toBeInTheDocument()
  })
})
