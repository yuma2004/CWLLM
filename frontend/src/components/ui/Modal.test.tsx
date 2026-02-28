import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

describe('モーダルコンポーネント', () => {
  it('開いた状態でダイアログ要素を表示する', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <div>content</div>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Escキー入力で閉じるハンドラーを呼び出す', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose}>
        <div>content</div>
      </Modal>
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('表示時にフォーカスがモーダルへ移動する', async () => {
    render(
      <>
        <button type="button">trigger</button>
        <Modal isOpen onClose={vi.fn()}>
          <div>content</div>
        </Modal>
      </>
    )

    const trigger = screen.getByRole('button', { name: 'trigger' })
    trigger.focus()
    expect(trigger).toHaveFocus()

    const dialog = screen.getByRole('dialog')
    await waitFor(() => expect(dialog).toHaveFocus())
  })
})
