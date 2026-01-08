import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useFetch, useMutation } from '../hooks/useApi'
import { ApiRequestError } from '../lib/apiClient'

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

// モックモード: デザイン確認用（バックエンド不要で全ページアクセス可能）
const MOCK_AUTH =
  !import.meta.env.PROD && (import.meta.env.VITE_MOCK_AUTH ?? 'false') === 'true'
const MOCK_USER: User = {
  id: 'mock-user-1',
  email: 'admin@example.com',
  role: 'admin', // admin権限で全ページアクセス可能
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_AUTH ? MOCK_USER : null)
  const { data: authData, error: authError, setError: setAuthError, isLoading: isAuthLoading } =
    useFetch<{ user: User }>('/api/auth/me', {
      enabled: !MOCK_AUTH,
      errorMessage: '認証に失敗しました',
      cacheTimeMs: 0,
      onError: (_message, error) => {
        // 401エラーは認証されていない状態では正常な動作なので、エラー状態をクリア
        if (error instanceof ApiRequestError && error.status === 401) {
          setAuthError('')
        }
      },
    })

  const { mutate: loginRequest } = useMutation<{ token: string; user: User }, { email: string; password: string }>(
    '/api/auth/login',
    'POST'
  )

  const { mutate: logoutRequest } = useMutation<void, void>('/api/auth/logout', 'POST')

  useEffect(() => {
    if (MOCK_AUTH) return
    if (authData?.user) {
      setUser(authData.user)
      return
    }
    if (authError) {
      setUser(null)
    }
  }, [authData, authError])

  const login = async (email: string, password: string) => {
    const data = await loginRequest(
      { email, password },
      { errorMessage: 'ログインに失敗しました' }
    )
    if (data?.token) {
      // トークンをlocalStorageに保存（クロスドメイン対応）
      localStorage.setItem('auth_token', data.token)
    }
    if (data?.user) {
      // エラー状態をクリアしてからユーザーを設定
      // （初回ロード時のauthErrorが残っていると useEffect で user が null に戻される）
      setAuthError('')
      setUser(data.user)
    }
  }

  const logout = async () => {
    try {
      await logoutRequest(undefined, { errorMessage: 'ログアウトに失敗しました' })
    } catch {
      // noop
    }
    // トークンを削除
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading: MOCK_AUTH ? false : isAuthLoading,
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
