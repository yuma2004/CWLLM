import { useEffect, useId, useRef } from 'react'
import CloseIcon from './CloseIcon'
import { cn } from '../../lib/cn'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const Modal = ({ isOpen, onClose, title, children, footer, className }: ModalProps) => {
  const dialogId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const previousOverflowRef = useRef<string>('')

  const getFocusableElements = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.tabIndex >= 0 && !element.hasAttribute('disabled'))

  useEffect(() => {
    if (!isOpen) return
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusableElements = getFocusableElements(container)
      if (focusableElements.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (activeElement && !container.contains(activeElement)) {
        event.preventDefault()
        if (event.shiftKey) {
          lastElement.focus()
        } else {
          firstElement.focus()
        }
        return
      }

      if (event.shiftKey) {
        if (activeElement === firstElement || activeElement === container) {
          event.preventDefault()
          lastElement.focus()
        }
      } else if (activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = window.setTimeout(() => {
      containerRef.current?.focus()
    }, 0)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflowRef.current
      window.clearTimeout(focusTimer)
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overscroll-contain safe-area-top safe-area-bottom">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 border-0 p-0"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? dialogId : undefined}
        ref={containerRef}
        tabIndex={-1}
      >
        {title && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 id={dialogId} className="text-lg font-semibold text-slate-900">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              aria-label="閉じる"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        )}
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

export default Modal