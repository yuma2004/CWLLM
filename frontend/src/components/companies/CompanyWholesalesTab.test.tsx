import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CompanyWholesalesTab from './CompanyWholesalesTab'
import { createWholesale } from '../../test/msw/factory'
import { formatDate } from '../../utils/date'
import { formatCurrency } from '../../utils/format'

const renderWholesalesTab = ({
  isLoading = false,
  error,
  wholesales = [],
}: {
  isLoading?: boolean
  error?: string
  wholesales?: ReturnType<typeof createWholesale>[]
} = {}) =>
  render(
    <MemoryRouter>
      <CompanyWholesalesTab wholesales={wholesales} isLoading={isLoading} error={error} />
    </MemoryRouter>
  )

describe('企業詳細の卸タブ', () => {
  it('読み込み中はスケルトン表示のみを出す', () => {
    const { container } = renderWholesalesTab({ isLoading: true })

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('卸がありません')).not.toBeInTheDocument()
  })

  it('エラー時はエラーメッセージを表示する', () => {
    renderWholesalesTab({ error: '卸の取得に失敗しました' })

    expect(screen.getByRole('alert')).toHaveTextContent('卸の取得に失敗しました')
  })

  it('卸が空の場合は空状態メッセージと導線リンクを表示する', () => {
    renderWholesalesTab()

    expect(screen.getByText('卸がありません')).toBeInTheDocument()
    expect(screen.getByText('案件詳細から卸を追加できます。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '案件一覧へ' })).toHaveAttribute('href', '/projects')
  })

  it('卸一覧の案件情報・単価・マージン・成立日を表示する', () => {
    const wholesales = [
      createWholesale({
        id: 'wholesale-1',
        status: 'active',
        projectId: 'project-1',
        project: {
          id: 'project-1',
          name: '一次卸案件',
          company: { id: 'company-1', name: '株式会社A' },
        },
        unitPrice: 88000,
        margin: 12.5,
        agreedDate: '2026-02-10',
        conditions: '条件メモ',
      }),
      createWholesale({
        id: 'wholesale-2',
        status: 'closed',
        projectId: 'project-unknown',
        project: undefined,
        unitPrice: null,
        margin: null,
        agreedDate: null,
        conditions: null,
      }),
    ]
    renderWholesalesTab({ wholesales })

    expect(screen.getByRole('link', { name: '一次卸案件' })).toHaveAttribute(
      'href',
      '/wholesales/wholesale-1'
    )
    expect(screen.getByText('稼働中')).toBeInTheDocument()
    expect(screen.getByText('案件: 一次卸案件')).toBeInTheDocument()
    expect(screen.getByText(`単価: ${formatCurrency(88000)}`)).toBeInTheDocument()
    expect(screen.getByText('マージン: 12.5%')).toBeInTheDocument()
    expect(screen.getByText(`成立日: ${formatDate('2026-02-10')}`)).toBeInTheDocument()
    expect(screen.getByText('条件メモ')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: '卸 wholesale-2' })).toHaveAttribute(
      'href',
      '/wholesales/wholesale-2'
    )
    expect(screen.getByText('案件: project-unknown')).toBeInTheDocument()
    expect(screen.getAllByText('単価: -').length).toBeGreaterThan(0)
    expect(screen.getByText('マージン: -')).toBeInTheDocument()
    expect(screen.getByText(`成立日: ${formatDate(null)}`)).toBeInTheDocument()
  })
})
