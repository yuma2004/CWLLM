import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Modal from './Modal'

describe('Modal', () => {
  it('renders dialog role', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <div>content</div>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose}>
        <div>content</div>
      </Modal>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus to modal on open', async () => {
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
