import { useId, useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './Popover'

type MultiSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type MultiSelectProps = {
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  name?: string
  id?: string
  ariaLabel?: string
  searchable?: boolean
  searchPlaceholder?: string
  emptyLabel?: string
  maxSelectedDisplay?: number
  renderValue?: (selected: MultiSelectOption[]) => React.ReactNode
  className?: string
  buttonClassName?: string
  contentClassName?: string
}

const MultiSelect = ({
  options,
  value,
  onChange,
  label,
  placeholder = '選択してください',
  hint,
  error,
  disabled = false,
  name,
  id,
  ariaLabel,
  searchable = false,
  searchPlaceholder = '検索',
  emptyLabel = '候補がありません',
  maxSelectedDisplay = 2,
  renderValue,
  className,
  buttonClassName,
  contentClassName,
}: MultiSelectProps) => {
  const generatedId = useId()
  const triggerId = id ?? (label || hint || error ? generatedId : undefined)
  const errorId = error && triggerId ? `${triggerId}-error` : undefined
  const hintId = hint && triggerId ? `${triggerId}-hint` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined
  const triggerAriaLabel = ariaLabel ?? (label ? undefined : placeholder)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedSet = useMemo(() => new Set(value), [value])
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet]
  )

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const lowerQuery = query.trim().toLowerCase()
    return options.filter((option) => option.label.toLowerCase().includes(lowerQuery))
  }, [options, query])

  const selectedLabels = selectedOptions.map((option) => option.label)
  const hasSelection = selectedLabels.length > 0
  const displayLabels = hasSelection
    ? selectedLabels.length > maxSelectedDisplay
      ? `${selectedLabels.slice(0, maxSelectedDisplay).join(', ')} +${
          selectedLabels.length - maxSelectedDisplay
        }`
      : selectedLabels.join(', ')
    : placeholder
  const showCountBadge = !renderValue && hasSelection

  const handleToggle = (optionValue: string) => {
    if (disabled) return
    if (selectedSet.has(optionValue)) {
      onChange(value.filter((item) => item !== optionValue))
      return
    }
    onChange([...value, optionValue])
  }

  const handleClear = () => {
    if (!disabled) onChange([])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery('')
  }

  return (
    <div className={className}>
      {name ? value.map((item) => <input key={item} type="hidden" name={name} value={item} />) : null}
      {label && (
        <label htmlFor={triggerId} className="mb-1 block text-xs font-medium text-notion-text-secondary">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            id={triggerId}
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-xl border border-notion-border bg-notion-bg px-3 py-2 text-left text-sm text-notion-text shadow-sm hover:border-notion-border focus-visible:border-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30 disabled:cursor-not-allowed disabled:bg-notion-bg-secondary disabled:text-notion-text-tertiary',
              error && 'border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/30',
              buttonClassName
            )}
            aria-label={triggerAriaLabel}
            aria-describedby={describedBy}
            disabled={disabled}
          >
            <div className="min-w-0 flex-1">
              {renderValue ? (
                renderValue(selectedOptions)
              ) : (
                <span className={cn('truncate', !hasSelection && 'text-notion-text-tertiary')}>
                  {displayLabels}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showCountBadge && (
                <span className="rounded-full bg-notion-bg-hover px-2 py-0.5 text-xs text-notion-text-secondary">
                  {selectedLabels.length}
                </span>
              )}
              <svg
                className={cn('size-4 text-notion-text-tertiary', open && 'rotate-180')}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className={cn(
            'min-w-[var(--radix-popover-trigger-width)] p-3',
            contentClassName
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-notion-border pb-2">
            <span className="text-xs font-medium text-notion-text-tertiary">
              {selectedLabels.length} 選択中
            </span>
            {selectedLabels.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-notion-text-tertiary hover:text-notion-text"
                onClick={handleClear}
              >
                クリア
              </button>
            )}
          </div>
          {searchable && (
            <div className="mt-2">
              <input
                type="search"
                className="w-full rounded-xl border border-notion-border bg-notion-bg px-3 py-2 text-sm placeholder:text-notion-text-tertiary hover:border-notion-border focus-visible:border-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          <div className="mt-2 max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="space-y-3 px-2 py-2">
                <p className="text-sm text-notion-text-secondary">{emptyLabel}</p>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-notion-border px-3 py-1.5 text-xs font-medium text-notion-text-secondary hover:bg-notion-bg-hover"
                  >
                    閉じる
                  </button>
                </PopoverClose>
              </div>
            ) : (
              <div role="group" aria-label={label ?? 'Options'} className="space-y-1">
                {filteredOptions.map((option) => {
                  const isChecked = selectedSet.has(option.value)
                  const isDisabled = disabled || option.disabled
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm text-notion-text hover:bg-notion-bg-hover',
                        isDisabled && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4 rounded border border-slate-300 accent-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30"
                        checked={isChecked}
                        onChange={() => handleToggle(option.value)}
                        disabled={isDisabled}
                      />
                      <span className="text-pretty">{option.label}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-notion-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default MultiSelect
