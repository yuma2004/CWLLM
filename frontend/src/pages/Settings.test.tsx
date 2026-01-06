import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Settings from './Settings'

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const queueResponse = (payload: unknown) =>
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  } as Response)

describe('Settings page', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  it('loads and saves settings', async () => {
    queueResponse({ settings: { summaryDefaultPeriodDays: 30, tagOptions: ['vip'] } })
    queueResponse({ settings: { summaryDefaultPeriodDays: 14, tagOptions: ['vip', 'focus'] } })

    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByLabelText('要約のデフォルト期間（日）')).toHaveValue(30)
      expect(screen.getByLabelText('タグ候補')).toHaveValue('vip')
    })

    fireEvent.change(screen.getByLabelText('要約のデフォルト期間（日）'), {
      target: { value: '14' },
    })
    fireEvent.change(screen.getByLabelText('タグ候補'), {
      target: { value: 'vip\nfocus' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => {
      expect(screen.getByText('設定を保存しました')).toBeInTheDocument()
    })
  })
})
