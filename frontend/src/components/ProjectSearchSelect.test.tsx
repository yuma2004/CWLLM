import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ProjectSearchSelect from './ProjectSearchSelect'
import { useFetch } from '../hooks/useApi'

vi.mock('../hooks/useApi', () => ({
  useFetch: vi.fn(),
}))

const mockUseFetch = vi.mocked(useFetch)

const buildFetchState = () => ({
  data: null,
  setData: vi.fn(),
  error: '',
  setError: vi.fn(),
  isLoading: false,
  refetch: vi.fn(),
})

describe('ProjectSearchSelect', () => {
  beforeEach(() => {
    mockUseFetch.mockReset()
    mockUseFetch.mockReturnValue(buildFetchState())
  })

  it('shows clear button when value is present', () => {
    render(<ProjectSearchSelect value="project-1" onChange={vi.fn()} />)

    const clearButton = screen.getByLabelText('clear')
    expect(clearButton).toBeInTheDocument()
    expect(clearButton).toHaveTextContent('×')
  })

  it('clears value when clicking the clear button', () => {
    const handleChange = vi.fn()
    render(<ProjectSearchSelect value="project-1" onChange={handleChange} />)

    const clearButton = screen.getByLabelText('clear')
    fireEvent.click(clearButton)

    expect(handleChange).toHaveBeenCalledWith('')
  })
})
