import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'
import { FormFieldWrapper } from './FormFieldWrapper'

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
  noContainer?: boolean
}

const BASE_CLASS =
  'w-full rounded-xl border border-notion-border bg-notion-bg px-3 py-2 text-sm text-notion-text placeholder:text-notion-text-tertiary hover:border-notion-border focus-visible:border-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30 disabled:cursor-not-allowed disabled:bg-notion-bg-secondary disabled:text-notion-text-tertiary'

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      hint,
      error,
      className,
      containerClassName,
      id,
      noContainer,
      placeholder,
      'aria-label': ariaLabelProp,
      'aria-describedby': ariaDescribedByProp,
      'aria-invalid': ariaInvalidProp,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const shouldHaveId = Boolean(label || error || ariaDescribedByProp)
    const inputId = id ?? (shouldHaveId ? generatedId : undefined)
    const errorId = error && inputId ? `${inputId}-error` : undefined
    const inputClassName = cn(
      BASE_CLASS,
      error && 'border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/30',
      className
    )
    const ariaLabel = ariaLabelProp ?? (label ? undefined : placeholder)
    const describedBy = [ariaDescribedByProp, errorId].filter(Boolean).join(' ') || undefined
    const ariaInvalid = ariaInvalidProp ?? Boolean(error)

    return (
      <FormFieldWrapper
        label={label}
        fieldId={inputId}
        error={error}
        errorId={errorId}
        hint={hint}
        containerClassName={containerClassName}
        noContainer={noContainer}
      >
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
          {...props}
        />
      </FormFieldWrapper>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput
