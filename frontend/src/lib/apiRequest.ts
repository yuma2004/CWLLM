export const isAbortError = (err: unknown) =>
  err instanceof Error && 'name' in err && err.name === 'AbortError'

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

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

export const requestWithRetry = async <T>(
  request: () => Promise<T>,
  retry: number,
  retryDelayMs: number
) => {
  let responseData: T | null = null
  for (let attempt = 0; attempt <= retry; attempt += 1) {
    try {
      responseData = await request()
      break
    } catch (err) {
      if (isAbortError(err)) {
        throw err
      }
      if (attempt >= retry) {
        throw err
      }
      await delay(retryDelayMs)
    }
  }
  return responseData
}
