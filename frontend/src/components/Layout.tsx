import { ReactNode, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { protectedRoutes, type RouteConfig } from '../constants/routes'
import { usePermissions } from '../hooks/usePermissions'
import { cn } from '../lib/cn'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { role } = usePermissions()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('sidebarOpen') : null
    if (stored === 'true' || stored === 'false') {
      setIsSidebarOpen(stored === 'true')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('sidebarOpen', String(isSidebarOpen))
  }, [isSidebarOpen])

  const canShow = (route: RouteConfig) =>
    !route.allowedRoles || (role ? route.allowedRoles.includes(role) : false)

  const navItems = protectedRoutes.filter(
    (route) => route.section === 'main' && route.label && canShow(route)
  )
  const settingsItems = protectedRoutes.filter(
    (route) => route.section === 'settings' && route.label && canShow(route)
  )

  return (
    <div className="min-h-dvh flex bg-slate-50">
      {/* Sidebar Toggle Button - Mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white border border-slate-200 shadow-md lg:hidden safe-area-top"
        aria-label="サイドバーを開閉"
      >
        <svg className="size-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar Toggle Button - Desktop */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden lg:block lg:fixed top-4 left-4 z-30 p-2 rounded-lg bg-white border border-slate-200 shadow-md safe-area-top"
          aria-label="サイドバーを開く"
        >
          <svg className="size-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'w-64 bg-white border-r border-slate-100 flex-shrink-0 flex flex-col fixed h-full z-20 safe-area-top safe-area-bottom',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h1 className="text-balance text-base font-semibold text-slate-800">CW管理システム</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100"
              aria-label="サイドバーを閉じる"
            >
              <svg className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <nav className="space-y-0.5">
            {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end ?? item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border-l-2',
                      isActive
                        ? 'bg-slate-100 text-slate-900 border-slate-900 shadow-sm'
                        : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="px-3 text-[11px] font-medium text-slate-400 uppercase mb-2">設定</p>
            <nav className="space-y-0.5">
              {settingsItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium border-l-2',
                        isActive
                          ? 'bg-slate-100 text-slate-900 border-slate-900 shadow-sm'
                          : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-50'
                      )
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay (mobile only) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className={cn('flex-1 min-w-0', isSidebarOpen ? 'ml-64' : '')}>
        <main className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-5 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

export default Layout
