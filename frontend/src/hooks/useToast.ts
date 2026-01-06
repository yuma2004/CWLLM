import { useCallback, useEffect, useState } from 'react'

export type ToastState = {
  message: string
  variant?: 'success' | 'error' | 'info'
}

export const useToast = (durationMs = 2000) => {
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs, toast])

  const showToast = useCallback((message: string, variant: ToastState['variant']) => {
    setToast({ message, variant })
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  return { toast, showToast, clearToast }
}
