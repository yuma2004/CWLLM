import CloseIcon from './CloseIcon'

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
    className={[
      'flex items-center justify-between gap-3 rounded-full px-4 py-2 text-sm shadow-lg',
      VARIANT_CLASSES[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    role={variant === 'error' ? 'alert' : 'status'}
  >
    <span>{message}</span>
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        className="text-white/80 hover:text-white"
        aria-label="close"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    )}
  </div>
)

export default Toast
