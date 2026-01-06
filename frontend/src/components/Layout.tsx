import { ReactNode, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { buildNavItems, buildSettingsItems } from '../constants/navConfig'
import { usePermissions } from '../hooks/usePermissions'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { isAdmin } = usePermissions()
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

  const navItems = buildNavItems()
  const settingsItems = buildSettingsItems(isAdmin)

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
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/30">
                CW
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  CW管理システム
                </h1>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">管理ハブ</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="サイドバーを閉じる"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="space-y-1">
            {navItems
              .filter((item) => item.show)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                    ].join(' ')
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              システム
            </p>
            <nav className="space-y-1">
              {settingsItems
                .filter((item) => item.show)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
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
