import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useFetch, useMutation } from '../hooks/useApi'
import { ApiRequestError } from '../lib/apiClient'
import { apiRoutes } from '../lib/apiRoutes'
import { clearAuthToken, getAuthToken, setAuthToken } from '../lib/authToken'

interface User {
  id: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ?????????????????VITE_MOCK_AUTH=true?
const MOCK_AUTH =
  !import.meta.env.PROD && (import.meta.env.VITE_MOCK_AUTH ?? 'false') === 'true'
const MOCK_AUTH_TOKEN = import.meta.env.VITE_MOCK_AUTH_TOKEN ?? ''
const MOCK_USER: User = {
  id: 'mock-user-1',
  email: 'admin@example.com',
  role: 'admin',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_AUTH ? MOCK_USER : null)
  const [hasToken, setHasToken] = useState(() => !!getAuthToken())
  const {
    data: authData,
    error: authError,
    setError: setAuthError,
    isLoading: isAuthLoading,
  } = useFetch<{ user: User }>(apiRoutes.auth.me(), {
    enabled: !MOCK_AUTH && hasToken,
    errorMessage: '認証情報の取得に失敗しました。',
    cacheTimeMs: 0,
    authMode: 'bearer',
    onError: (_message, error) => {
      if (error instanceof ApiRequestError && error.status === 401) {
        clearAuthToken()
        setHasToken(false)
        setUser(null)
        setAuthError('')
      }
    },
  })

  const { mutate: loginRequest } = useMutation<
    { token: string; user: User },
    { email: string; password: string }
  >(apiRoutes.auth.login(), 'POST')

  const { mutate: logoutRequest } = useMutation<void, void>(apiRoutes.auth.logout(), 'POST')

  useEffect(() => {
    if (MOCK_AUTH) return
    if (authData?.user) {
      setUser(authData.user)
      return
    }
  }, [authData, authError])

  useEffect(() => {
    if (MOCK_AUTH) return
    if (!hasToken) {
      setUser(null)
    }
  }, [hasToken])

  useEffect(() => {
    if (MOCK_AUTH) return
    if (typeof window === 'undefined') return
    const updateToken = () => setHasToken(!!getAuthToken())
    updateToken()
    window.addEventListener('storage', updateToken)
    return () => window.removeEventListener('storage', updateToken)
  }, [])

  useEffect(() => {
    if (!MOCK_AUTH) return
    if (!MOCK_AUTH_TOKEN) return
    if (getAuthToken()) return
    setAuthToken(MOCK_AUTH_TOKEN)
    setHasToken(true)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await loginRequest(
      { email, password },
      { errorMessage: 'ログインに失敗しました。' }
    )
    if (data?.token) {
      setAuthToken(data.token)
      setHasToken(true)
    }
    if (data?.user) {
      setAuthError('')
      setUser(data.user)
    }
  }

  const logout = async () => {
    try {
      await logoutRequest(undefined, { errorMessage: 'ログアウトに失敗しました。' })
    } catch {
      // noop
    }
    clearAuthToken()
    setHasToken(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading: MOCK_AUTH ? false : isAuthLoading && !user,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

