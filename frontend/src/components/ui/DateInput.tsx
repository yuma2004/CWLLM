import { forwardRef, useId, useRef } from 'react'
import FormInput from './FormInput'
import { cn } from '../../lib/cn'

type DateInputProps = Omit<React.ComponentPropsWithoutRef<typeof FormInput>, 'type'>

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      label,
      hint,
      error,
      containerClassName,
      className,
      id,
      noContainer,
      placeholder,
      disabled,
      'aria-label': ariaLabelProp,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const shouldHaveId = Boolean(label || error)
    const inputId = id ?? (shouldHaveId ? generatedId : undefined)
    const errorId = error && inputId ? `${inputId}-error` : undefined
    const inputRef = useRef<HTMLInputElement | null>(null)
    const ariaLabelFallback =
      typeof placeholder === 'string' && placeholder.trim().length > 0
        ? placeholder
        : '日付を選択'
    const ariaLabel = ariaLabelProp ?? (label ? undefined : ariaLabelFallback)

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (!ref) return
      if (typeof ref === 'function') {
        ref(node)
      } else {
        ref.current = node
      }
    }

    const handleOpenPicker = () => {
      if (disabled) return
      const input = inputRef.current
      if (!input) return
      if ('showPicker' in HTMLInputElement.prototype && typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        input.focus()
      }
    }

    const inputField = (
      <div className="relative">
        <FormInput
          ref={setRefs}
          id={inputId}
          type="date"
          noContainer
          className={cn('pr-10', className)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          error={error}
          {...props}
        />
        <button
          type="button"
          onClick={handleOpenPicker}
          aria-label="カレンダーを開く"
          disabled={disabled}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30',
            disabled && 'cursor-not-allowed text-slate-300 hover:text-slate-300'
          )}
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3M4 11h16M5 7h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
            />
          </svg>
        </button>
      </div>
    )

    if (noContainer) {
      return inputField
    }

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </label>
        )}
        {inputField}
        {error ? <p id={errorId} className="mt-1 text-xs text-rose-600">{error}</p> : null}
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

DateInput.displayName = 'DateInput'

export default DateInput
