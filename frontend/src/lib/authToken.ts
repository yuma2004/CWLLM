const TOKEN_STORAGE_KEY = 'cwllm.auth.token'
let authToken: string | null = null

export const getAuthToken = () => {
  if (authToken) return authToken
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY)
  authToken = stored ? stored : null
  return authToken
}

export const setAuthToken = (token?: string | null) => {
  const nextToken = token?.trim()
  authToken = nextToken ? nextToken : null
  if (typeof window === 'undefined') return
  if (authToken) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, authToken)
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export const clearAuthToken = () => {
  authToken = null
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}
