import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { clearAuthToken } from './lib/authToken'

describe('アプリケーションルーティング', () => {
  beforeEach(() => {
    clearAuthToken()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('未認証の状態で保護ページへアクセスするとログイン画面を表示する', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })
})
