import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'
import App from './App'

vi.mock('./contexts/AuthContext', () => {
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: () => ({
      user: null,
      login: vi.fn(async () => {}),
      logout: vi.fn(async () => {}),
      isLoading: false,
      isAuthenticated: false,
    }),
  }
})

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
globalThis.fetch = mockFetch as unknown as typeof fetch

describe('App', () => {
  it('renders login page when not authenticated', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response)

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    })
  })
})
