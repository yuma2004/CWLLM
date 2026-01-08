import { ReactNode, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { protectedRoutes, type RouteConfig } from '../constants/routes'
import { usePermissions } from '../hooks/usePermissions'

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
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Toggle Button - Mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-20 p-2 rounded-lg bg-white border border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200 lg:hidden"
        aria-label="サイドバーを開閉"
      >
        <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          className="hidden lg:block lg:fixed top-4 left-4 z-20 p-2 rounded-lg bg-white border border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200"
          aria-label="サイドバーを開く"
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 bg-white border-r border-slate-100 flex-shrink-0 flex flex-col fixed h-full z-10
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h1 className="text-base font-semibold text-slate-800">
              管理システム
            </h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="サイドバーを閉じる"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    [
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                    ].join(' ')
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
              システム
            </p>
            <nav className="space-y-0.5">
              {settingsItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                      ].join(' ')
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
          className="fixed inset-0 bg-black/50 z-[5] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : ''}`}>
        <main className="max-w-6xl mx-auto px-8 py-8 animate-fade-up">{children}</main>
      </div>
    </div>
  )
}

export default Layout
