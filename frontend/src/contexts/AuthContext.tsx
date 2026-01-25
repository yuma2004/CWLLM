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

// 繝｢繝・け繝｢繝ｼ繝・ 繝・じ繧､繝ｳ遒ｺ隱咲畑・医ヰ繝・け繧ｨ繝ｳ繝我ｸ崎ｦ√〒蜈ｨ繝壹・繧ｸ繧｢繧ｯ繧ｻ繧ｹ蜿ｯ閭ｽ・・
const MOCK_AUTH =
  !import.meta.env.PROD && (import.meta.env.VITE_MOCK_AUTH ?? 'false') === 'true'
const MOCK_USER: User = {
  id: 'mock-user-1',
  email: 'admin@example.com',
  role: 'admin', // admin讓ｩ髯舌〒蜈ｨ繝壹・繧ｸ繧｢繧ｯ繧ｻ繧ｹ蜿ｯ閭ｽ
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_AUTH ? MOCK_USER : null)
  const [hasToken, setHasToken] = useState(() => !!getAuthToken())
  const { data: authData, error: authError, setError: setAuthError, isLoading: isAuthLoading } =
    useFetch<{ user: User }>(apiRoutes.auth.me(), {
      enabled: !MOCK_AUTH && hasToken,
      errorMessage: '隱崎ｨｼ縺ｫ螟ｱ謨励＠縺ｾ縺励◆',
      cacheTimeMs: 0,
      authMode: 'bearer',
      onError: (_message, error) => {
        // 401繧ｨ繝ｩ繝ｼ縺ｯ隱崎ｨｼ縺輔ｌ縺ｦ縺・↑縺・憾諷九〒縺ｯ豁｣蟶ｸ縺ｪ蜍穂ｽ懊↑縺ｮ縺ｧ縲√お繝ｩ繝ｼ迥ｶ諷九ｒ繧ｯ繝ｪ繧｢
        if (error instanceof ApiRequestError && error.status === 401) {
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
    if (authError) {
      setUser(null)
    }
  }, [authData, authError])

  useEffect(() => {
    if (MOCK_AUTH) return
    if (typeof window === 'undefined') return
    const updateToken = () => setHasToken(!!getAuthToken())
    updateToken()
    window.addEventListener('storage', updateToken)
    return () => window.removeEventListener('storage', updateToken)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await loginRequest(
      { email, password },
      { errorMessage: '繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' }
    )
    if (data?.token) {
      setAuthToken(data.token)
      setHasToken(true)
    }
    if (data?.user) {
      // 繧ｨ繝ｩ繝ｼ迥ｶ諷九ｒ繧ｯ繝ｪ繧｢縺励※縺九ｉ繝ｦ繝ｼ繧ｶ繝ｼ繧定ｨｭ螳・      // ・亥・蝗槭Ο繝ｼ繝画凾縺ｮauthError縺梧ｮ九▲縺ｦ縺・ｋ縺ｨ useEffect 縺ｧ user 縺・null 縺ｫ謌ｻ縺輔ｌ繧具ｼ・      setAuthError('')
      setUser(data.user)
    }
  }

  const logout = async () => {
    try {
      await logoutRequest(undefined, { errorMessage: '繝ｭ繧ｰ繧｢繧ｦ繝医↓螟ｱ謨励＠縺ｾ縺励◆' })
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
