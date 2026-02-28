import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CompanyProjectsTab from './CompanyProjectsTab'
import { createProject } from '../../test/msw/factory'
import { formatDate } from '../../utils/date'
import { formatCurrency } from '../../utils/format'

const renderProjectsTab = ({
  isLoading = false,
  error,
  projects = [],
}: {
  isLoading?: boolean
  error?: string
  projects?: ReturnType<typeof createProject>[]
} = {}) =>
  render(
    <MemoryRouter>
      <CompanyProjectsTab projects={projects} isLoading={isLoading} error={error} />
    </MemoryRouter>
  )

describe('企業詳細の案件タブ', () => {
  it('読み込み中はスケルトン表示のみを出す', () => {
    const { container } = renderProjectsTab({ isLoading: true })

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('案件がありません')).not.toBeInTheDocument()
  })

  it('エラー時はエラーメッセージを表示する', () => {
    renderProjectsTab({ error: '案件の取得に失敗しました' })

    expect(screen.getByRole('alert')).toHaveTextContent('案件の取得に失敗しました')
  })

  it('案件が空の場合は空状態メッセージと導線リンクを表示する', () => {
    renderProjectsTab()

    expect(screen.getByText('案件がありません')).toBeInTheDocument()
    expect(screen.getByText('案件一覧から追加できます。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '案件一覧へ' })).toHaveAttribute('href', '/projects')
  })

  it('案件一覧の期間・単価・更新日をフォーマットして表示する', () => {
    const projects = [
      createProject({
        id: 'project-1',
        name: '期間あり案件',
        status: 'active',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        unitPrice: 120000,
        updatedAt: '2026-02-01T00:00:00.000Z',
        conditions: '条件A',
      }),
      createProject({
        id: 'project-2',
        name: '開始日のみ案件',
        status: 'paused',
        periodStart: '2026-03-01',
        periodEnd: null,
        unitPrice: 0,
        updatedAt: undefined,
        createdAt: '2026-03-05T00:00:00.000Z',
        conditions: null,
      }),
      createProject({
        id: 'project-3',
        name: '終了日のみ案件',
        status: 'closed',
        periodStart: null,
        periodEnd: '2026-04-01',
        unitPrice: null,
      }),
      createProject({
        id: 'project-4',
        name: '期間未設定案件',
        status: 'active',
        periodStart: null,
        periodEnd: null,
      }),
    ]
    renderProjectsTab({ projects })

    expect(screen.getByRole('link', { name: '期間あり案件' })).toHaveAttribute(
      'href',
      '/projects/project-1'
    )
    expect(screen.getAllByText('進行中').length).toBeGreaterThan(0)
    expect(
      screen.getByText(`期間: ${formatDate('2026-01-01')} 〜 ${formatDate('2026-01-31')}`)
    ).toBeInTheDocument()
    expect(screen.getByText(`単価: ${formatCurrency(120000)}`)).toBeInTheDocument()
    expect(screen.getByText(`更新: ${formatDate('2026-02-01T00:00:00.000Z')}`)).toBeInTheDocument()
    expect(screen.getByText('条件A')).toBeInTheDocument()

    expect(screen.getByText(`期間: ${formatDate('2026-03-01')} 〜`)).toBeInTheDocument()
    expect(screen.getByText(`単価: ${formatCurrency(0)}`)).toBeInTheDocument()
    expect(screen.getByText(`更新: ${formatDate('2026-03-05T00:00:00.000Z')}`)).toBeInTheDocument()

    expect(screen.getByText(`期間: 〜 ${formatDate('2026-04-01')}`)).toBeInTheDocument()
    expect(screen.getByText('期間: -')).toBeInTheDocument()
    expect(screen.getByText('単価: -')).toBeInTheDocument()
    expect(screen.queryByText('条件なし')).not.toBeInTheDocument()
  })
})
