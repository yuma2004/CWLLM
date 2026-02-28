import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import NotFound from './NotFound'

const renderNotFoundPage = () =>
  render(
    <MemoryRouter initialEntries={['/missing-page']}>
      <Routes>
        <Route path="/" element={<h1>ダッシュボード</h1>} />
        <Route path="/tasks" element={<h1>タスク一覧</h1>} />
        <Route path="/companies" element={<h1>企業一覧</h1>} />
        <Route path="/projects" element={<h1>案件一覧</h1>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  )

describe('404ページ', () => {
  it('存在しないURLでは404メッセージと主要導線を表示する', () => {
    // Given
    renderNotFoundPage()

    // When
    const heading = screen.getByRole('heading', { name: 'ページが見つかりません' })

    // Then
    expect(heading).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ダッシュボードへ戻る' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'タスク一覧' })).toHaveAttribute('href', '/tasks')
    expect(screen.getByRole('link', { name: '企業一覧' })).toHaveAttribute('href', '/companies')
    expect(screen.getByRole('link', { name: '案件一覧' })).toHaveAttribute('href', '/projects')
  })

  it('ダッシュボードへ戻るを押すとトップ画面へ遷移する', async () => {
    // Given
    const user = userEvent.setup()
    renderNotFoundPage()

    // When
    await user.click(screen.getByRole('link', { name: 'ダッシュボードへ戻る' }))

    // Then
    expect(await screen.findByRole('heading', { name: 'ダッシュボード' })).toBeInTheDocument()
  })
})
