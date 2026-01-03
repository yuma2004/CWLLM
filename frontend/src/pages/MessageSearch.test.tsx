import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MessageSearch from './MessageSearch'

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const queueResponse = (payload: unknown) =>
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  } as Response)

describe('MessageSearch page', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  it('searches messages with query', async () => {
    queueResponse({
      items: [{ id: 'c1', name: 'Acme' }],
      pagination: { page: 1, pageSize: 1000, total: 1 },
    })
    queueResponse({
      items: [
        {
          id: 'm1',
          roomId: 'room-1',
          messageId: '10',
          sender: 'sender',
          body: 'alpha message',
          sentAt: new Date().toISOString(),
          companyId: 'c1',
          labels: ['VIP'],
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1 },
    })

    render(
      <MemoryRouter>
        <MessageSearch />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('キーワード'), {
      target: { value: 'alpha' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'search-submit' }))

    await waitFor(() => {
      const searchCall = mockFetch.mock.calls.find(
        ([url]) => typeof url === 'string' && (url as string).includes('/api/messages/search')
      )
      expect(searchCall).toBeTruthy()
    })

    const url = mockFetch.mock.calls
      .map(([callUrl]) => callUrl as string)
      .find((callUrl) => callUrl.includes('/api/messages/search'))
    expect(url).toContain('q=alpha')

    expect(await screen.findByText('alpha message')).toBeInTheDocument()
  })
})
