import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// fetchをモック
const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
globalThis.fetch = mockFetch as unknown as typeof fetch

describe('App', () => {
  it('renders login page when not authenticated', async () => {
    // 認証チェックが失敗するようにモック
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response)

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // 認証チェックが完了するまで待つ
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ログイン/i })).toBeInTheDocument()
    })
  })
})
