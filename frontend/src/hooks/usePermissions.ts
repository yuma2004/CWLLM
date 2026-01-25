import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function usePermissions() {
  const { user } = useAuth()

  return useMemo(() => {
    const role = user?.role
    return {
      role,
      canWrite: role === 'admin' || role === 'employee',
      isAdmin: role === 'admin',
    }
  }, [user?.role])
}
