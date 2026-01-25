import * as Dialog from '@radix-ui/react-dialog'
import CloseIcon from './CloseIcon'
import { cn } from '../../lib/cn'

type SlidePanelProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  ariaLabel?: string
  children: React.ReactNode
  footer?: React.ReactNode
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SlidePanel = ({
  isOpen,
  onClose,
  title,
  description,
  ariaLabel = 'Panel',
  children,
  footer,
  side = 'right',
  size = 'md',
  className,
}: SlidePanelProps) => {
  const sideClasses =
    side === 'right'
      ? 'right-0 border-l border-notion-border safe-area-right'
      : 'left-0 border-r border-notion-border safe-area-left'
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  } as const

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <Dialog.Content
          className={cn(
            'fixed top-0 z-50 flex h-dvh w-full flex-col bg-notion-bg shadow-xl outline-none safe-area-top safe-area-bottom',
            sizeClasses[size],
            sideClasses,
            className
          )}
          aria-label={title ? undefined : ariaLabel}
        >
          <div className="flex items-start justify-between gap-3 border-b border-notion-border px-6 py-4">
            <div className="space-y-1">
              {title && (
                <Dialog.Title className="text-balance text-lg font-semibold text-notion-text">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="text-pretty text-sm text-notion-text-secondary">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-2 text-notion-text-tertiary hover:text-notion-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30"
                aria-label="閉じる"
              >
                <CloseIcon className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {footer && <div className="border-t border-notion-border px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default SlidePanel
