import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { ProjectSearchSelect } from './SearchSelect'
import { server } from '../test/msw/server'

describe('案件検索セレクト', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/projects/search', ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q') ?? ''
        const items =
          q.trim().length === 0
            ? []
            : [
                { id: 'project-2', name: `${q}案件` },
                { id: 'project-3', name: `${q}候補` },
              ]
        return HttpResponse.json({ items })
      }),
      http.get('/api/projects/:id', ({ params }) => {
        return HttpResponse.json({
          project: {
            id: String(params.id),
            name: '既存案件',
          },
        })
      })
    )
  })

  it('選択済みの値があるとクリアボタンを表示する', () => {
    render(<ProjectSearchSelect value="project-1" onChange={vi.fn()} />)

    expect(screen.getByLabelText('選択をクリア')).toBeInTheDocument()
  })

  it('クリアボタンを押すと選択を解除する', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<ProjectSearchSelect value="project-1" onChange={handleChange} />)

    await user.click(screen.getByLabelText('選択をクリア'))

    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('検索候補を選ぶと選択値を通知する', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<ProjectSearchSelect value="" onChange={handleChange} />)

    await user.type(screen.getByRole('searchbox'), '新規')
    await user.click(await screen.findByRole('button', { name: '新規案件' }))

    await waitFor(() => {
      expect(handleChange).toHaveBeenLastCalledWith(
        'project-2',
        expect.objectContaining({ id: 'project-2', name: '新規案件' })
      )
    })
  })
})
