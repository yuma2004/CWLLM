import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CompanyRelationsSection from './CompanyRelationsSection'
import { useFetch } from '../hooks/useApi'

vi.mock('../hooks/useApi', () => ({
  useFetch: vi.fn(),
}))

const mockUseFetch = vi.mocked(useFetch)

describe('CompanyRelationsSection', () => {
  beforeEach(() => {
    mockUseFetch.mockReset()
  })

  it('shows project status using project labels and keeps wholesale labels', () => {
    mockUseFetch
      .mockReturnValueOnce({
        data: {
          projects: [
            {
              id: 'p1',
              name: '案件A',
              companyId: 'c1',
              status: 'active',
            },
          ],
        },
        error: '',
        setData: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
        refetch: vi.fn(),
      })
      .mockReturnValueOnce({
        data: {
          wholesales: [
            {
              id: 'w1',
              status: 'active',
              projectId: 'p1',
              companyId: 'c1',
              unitPrice: 120000,
              project: {
                id: 'p1',
                name: '案件A',
              },
            },
          ],
        },
        error: '',
        setData: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
        refetch: vi.fn(),
      })

    render(
      <MemoryRouter>
        <CompanyRelationsSection companyId="c1" />
      </MemoryRouter>
    )

    expect(screen.getByText('稼働中')).toBeInTheDocument()
    expect(screen.getByText('有効')).toBeInTheDocument()
    expect(screen.getByText('単価: ¥120,000')).toBeInTheDocument()
  })
})
