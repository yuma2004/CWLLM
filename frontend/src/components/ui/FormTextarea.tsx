import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'
import { FormFieldWrapper } from './FormFieldWrapper'

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
  noContainer?: boolean
}

const BASE_CLASS =
  'w-full rounded-xl border border-notion-border bg-notion-bg px-3 py-2 text-sm text-notion-text placeholder:text-notion-text-tertiary hover:border-notion-border focus-visible:border-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30 disabled:cursor-not-allowed disabled:bg-notion-bg-secondary disabled:text-notion-text-tertiary'

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
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
    const textareaId = id ?? (shouldHaveId ? generatedId : undefined)
    const errorId = error && textareaId ? `${textareaId}-error` : undefined
    const textareaClassName = cn(
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
        fieldId={textareaId}
        error={error}
        errorId={errorId}
        hint={hint}
        containerClassName={containerClassName}
        noContainer={noContainer}
      >
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClassName}
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

FormTextarea.displayName = 'FormTextarea'

export default FormTextarea
