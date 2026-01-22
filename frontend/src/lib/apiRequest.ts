export const isAbortError = (err: unknown) =>
  err instanceof Error && 'name' in err && err.name === 'AbortError'

export const createAbortController = (externalSignal?: AbortSignal | null) => {
  const controller = new AbortController()
  let externalAbortHandler: (() => void) | undefined
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalAbortHandler = () => controller.abort()
      externalSignal.addEventListener('abort', externalAbortHandler, { once: true })
    }
  }
  const cleanup = () => {
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener('abort', externalAbortHandler)
    }
  }
  return { controller, cleanup }
}
