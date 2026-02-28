import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CompanySummariesTab from './CompanySummariesTab'
import { formatDate } from '../../utils/date'
import type { Summary } from '../../types'

const renderSummariesTab = ({
  isLoading = false,
  error,
  summaries = [],
}: {
  isLoading?: boolean
  error?: string
  summaries?: Summary[]
} = {}) =>
  render(<CompanySummariesTab summaries={summaries} isLoading={isLoading} error={error} />)

describe('企業詳細のサマリータブ', () => {
  it('読み込み中はスケルトン表示のみを出す', () => {
    const { container } = renderSummariesTab({ isLoading: true })

    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('サマリーがありません')).not.toBeInTheDocument()
  })

  it('エラー時はエラーメッセージを表示する', () => {
    renderSummariesTab({ error: 'サマリーの取得に失敗しました' })

    expect(screen.getByRole('alert')).toHaveTextContent('サマリーの取得に失敗しました')
  })

  it('サマリーが空の場合は空状態メッセージを表示する', () => {
    renderSummariesTab()

    expect(screen.getByText('サマリーがありません')).toBeInTheDocument()
    expect(screen.getByText('期間を指定してサマリーを作成できます。')).toBeInTheDocument()
  })

  it('サマリー一覧の期間・種別・参照件数を表示する', () => {
    const summaries: Summary[] = [
      {
        id: 'summary-1',
        content: '手動作成の本文',
        type: 'manual',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        sourceLinks: ['https://example.com/1', 'https://example.com/2'],
        createdAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 'summary-2',
        content: '空種別の本文',
        type: '',
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        sourceLinks: [],
        createdAt: '2026-03-01T00:00:00.000Z',
      },
      {
        id: 'summary-3',
        content: '自動生成の本文',
        type: '自動生成',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        sourceLinks: [],
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ]
    renderSummariesTab({ summaries })

    expect(
      screen.getByText(`${formatDate('2026-01-01')} 〜 ${formatDate('2026-01-31')}`)
    ).toBeInTheDocument()
    expect(screen.getByText(`作成: ${formatDate('2026-02-01T00:00:00.000Z')}`)).toBeInTheDocument()
    expect(screen.getByText('参照: 2件')).toBeInTheDocument()
    expect(screen.getByText('手動作成の本文')).toBeInTheDocument()

    expect(screen.getAllByText('手動').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('自動生成')).toBeInTheDocument()
    expect(screen.getByText('自動生成の本文')).toBeInTheDocument()
  })
})
