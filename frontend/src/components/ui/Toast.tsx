import CloseIcon from './CloseIcon'
import { cn } from '../../lib/cn'

type ToastVariant = 'info' | 'success' | 'error'

type ToastProps = {
  message: string
  variant?: ToastVariant
  onClose?: () => void
  className?: string
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  info: 'bg-slate-900 text-white',
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
}

const Toast = ({ message, variant = 'info', onClose, className }: ToastProps) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 rounded-full px-4 py-2 text-sm shadow-lg',
      VARIANT_CLASSES[variant],
      className
    )}
    role="status"
    aria-live="polite"
  >
    <span className="min-w-0 flex-1 break-words">{message}</span>
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        className="text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-label="通知を閉じる"
      >
        <CloseIcon className="size-4" />
      </button>
    )}
  </div>
)

export default Toast
