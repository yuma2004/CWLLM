import { useEffect, useRef, type ReactNode } from 'react'
import CloseIcon from './CloseIcon'
import { cn } from '../../lib/cn'

export type AlertVariant = 'error' | 'success' | 'warning' | 'info'

type AlertProps = {
  variant: AlertVariant
  message?: string
  onClose?: () => void
  className?: string
  children?: ReactNode
}

const variantStyles: Record<AlertVariant, { bg: string; text: string; button: string }> = {
  error: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    button: 'text-rose-500 hover:text-rose-700',
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    button: 'text-emerald-500 hover:text-emerald-700',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    button: 'text-amber-500 hover:text-amber-700',
  },
  info: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    button: 'text-sky-500 hover:text-sky-700',
  },
}

const Alert = ({ variant, message, onClose, className, children }: AlertProps) => {
  const content = message ?? children
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const styles = variantStyles[variant]

  useEffect(() => {
    if (!content || typeof document === 'undefined') return
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
      previousFocusRef.current = activeElement
    }
  }, [content])

  if (!content) return null

  const handleClose = () => {
    onClose?.()
    if (previousFocusRef.current) {
      setTimeout(() => previousFocusRef.current?.focus(), 0)
    }
  }

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm',
        styles.bg,
        styles.text,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div>{content}</div>
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className={styles.button}
          aria-label="閉じめE"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </div>
  )
}

export default Alert