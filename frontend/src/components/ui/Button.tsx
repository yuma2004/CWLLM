import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingLabel?: string
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-notion-accent text-white hover:bg-notion-accent/90',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingLabel,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading
    const label = isLoading && loadingLabel ? loadingLabel : children

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          isDisabled && 'cursor-not-allowed opacity-60',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <span
            className="inline-block size-3 rounded-full border-2 border-white/60 border-t-white"
            aria-hidden="true"
          />
        )}
        {label}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
