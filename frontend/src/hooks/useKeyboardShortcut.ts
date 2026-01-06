import { useEffect } from 'react'

type Shortcut = {
  key: string
  handler: (event: KeyboardEvent) => void
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  preventDefault?: boolean
  enabled?: boolean
}

type ShortcutOptions = {
  enabled?: boolean
  ignoreInput?: boolean
  target?: Window | HTMLElement
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}

export function useKeyboardShortcut(shortcuts: Shortcut[], options: ShortcutOptions = {}) {
  const { enabled = true, ignoreInput = true, target } = options

  useEffect(() => {
    if (!enabled) return undefined
    const eventTarget = target ?? window

    const handleKeyDown = (event: KeyboardEvent) => {
      if (ignoreInput && isEditableTarget(event.target)) return

      shortcuts.forEach((shortcut) => {
        if (shortcut.enabled === false) return
        if (event.key !== shortcut.key) return
        if (shortcut.ctrlKey !== undefined && shortcut.ctrlKey !== event.ctrlKey) return
        if (shortcut.metaKey !== undefined && shortcut.metaKey !== event.metaKey) return
        if (shortcut.shiftKey !== undefined && shortcut.shiftKey !== event.shiftKey) return
        if (shortcut.altKey !== undefined && shortcut.altKey !== event.altKey) return

        if (shortcut.preventDefault) {
          event.preventDefault()
        }
        shortcut.handler(event)
      })
    }

    eventTarget.addEventListener('keydown', handleKeyDown as EventListener)
    return () => eventTarget.removeEventListener('keydown', handleKeyDown as EventListener)
  }, [enabled, ignoreInput, shortcuts, target])
}
