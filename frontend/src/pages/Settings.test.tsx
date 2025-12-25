import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Settings from './Settings'

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const queueResponse = (payload: unknown) =>
  mockFetch.mockResolvedValueOnce({
    ok: true,
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
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '14' } })
    fireEvent.change(screen.getByDisplayValue('vip'), { target: { value: 'vip\nfocus' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => {
      expect(screen.getByText('Settings updated')).toBeInTheDocument()
    })
  })
})
