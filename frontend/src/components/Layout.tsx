import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { user } = useAuth()
  const role = user?.role
  const canWrite = role && role !== 'readonly'
  const isAdmin = role === 'admin'

  const navItems = [
    { to: '/', label: 'ダッシュボード', show: true },
    { to: '/companies', label: '企業', show: true },
    { to: '/messages/search', label: '検索', show: true },
    { to: '/messages/unassigned', label: '未紐づけ箱', show: !!canWrite },
    { to: '/settings/chatwork', label: '設定', show: !!isAdmin },
  ]

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_45%),linear-gradient(180deg,_#f8fafc,_#eef2ff)]">
      <header className="sticky top-0 z-10 border-b border-white/40 bg-white/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">CWLLM</p>
            <h1 className="text-xl font-semibold text-slate-900">
              Chatwork連携 企業/案件/対応管理システム
            </h1>
          </div>
          <nav className="flex gap-2 text-sm">
            {navItems
              .filter((item) => item.show)
              .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-full px-4 py-2 transition',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</main>
    </div>
  )
}

export default Layout
