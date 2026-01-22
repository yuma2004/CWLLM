let authToken: string | null = null

export const getAuthToken = () => authToken

export const setAuthToken = (token?: string | null) => {
  const nextToken = token?.trim()
  authToken = nextToken ? nextToken : null
}

export const clearAuthToken = () => {
  authToken = null
}
