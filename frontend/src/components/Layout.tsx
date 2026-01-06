import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { buildNavItems, buildSettingsItems } from '../constants/navConfig'
import { usePermissions } from '../hooks/usePermissions'
import { apiRequest } from '../lib/apiClient'

interface LayoutProps {
  children: ReactNode
}

interface SearchResponse {
  companies: Array<{ id: string; name: string; status?: string; category?: string | null }>
  projects: Array<{ id: string; name: string; company?: { id: string; name: string } }>
  wholesales: Array<{
    id: string
    status?: string
    company?: { id: string; name: string }
    project?: { id: string; name: string }
  }>
  tasks: Array<{ id: string; title: string; targetType: string; targetId: string }>
  contacts: Array<{ id: string; name: string; email?: string | null; company?: { id: string; name: string } }>
}

interface SearchItem {
  id: string
  label: string
  description?: string
  href: string
}

function Layout({ children }: LayoutProps) {
  const { canWrite, isAdmin } = usePermissions()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchRef.current) return
      if (!searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults(null)
      setSearchError('')
      setIsSearching(false)
      return
    }
    const timer = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchError('')
      try {
        const data = await apiRequest<SearchResponse>(`/api/search?q=${encodeURIComponent(trimmed)}`)
        setSearchResults(data)
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const navItems = buildNavItems(canWrite, isAdmin)
  const settingsItems = buildSettingsItems(isAdmin)

  const searchSections = useMemo(() => {
    if (!searchResults) return []
    const taskLink = (task: SearchResponse['tasks'][number]) => {
      if (task.targetType === 'company') return `/companies/${task.targetId}`
      if (task.targetType === 'project') return `/projects/${task.targetId}`
      return `/wholesales/${task.targetId}`
    }

    return [
      {
        label: 'Companies',
        items: searchResults.companies.map<SearchItem>((company) => ({
          id: company.id,
          label: company.name,
          description: company.status || company.category || undefined,
          href: `/companies/${company.id}`,
        })),
      },
      {
        label: 'Projects',
        items: searchResults.projects.map<SearchItem>((project) => ({
          id: project.id,
          label: project.name,
          description: project.company?.name || undefined,
          href: `/projects/${project.id}`,
        })),
      },
      {
        label: 'Wholesales',
        items: searchResults.wholesales.map<SearchItem>((wholesale) => ({
          id: wholesale.id,
          label: `${wholesale.company?.name || 'Unknown'} / ${wholesale.project?.name || 'Unknown'}`,
          description: wholesale.status || undefined,
          href: `/wholesales/${wholesale.id}`,
        })),
      },
      {
        label: 'Tasks',
        items: searchResults.tasks.map<SearchItem>((task) => ({
          id: task.id,
          label: task.title,
          description: task.targetType,
          href: taskLink(task),
        })),
      },
      {
        label: 'Contacts',
        items: searchResults.contacts.map<SearchItem>((contact) => ({
          id: contact.id,
          label: contact.name,
          description: contact.company?.name || contact.email || undefined,
          href: contact.company?.id ? `/companies/${contact.company.id}` : '/companies',
        })),
      },
    ]
  }, [searchResults])

  const hasResults = useMemo(
    () => searchSections.some((section) => section.items.length > 0),
    [searchSections]
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
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Management Hub</p>
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
        <main className="max-w-6xl mx-auto px-8 py-8 animate-fade-up">
          <div ref={searchRef} className="mb-6">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setIsSearchOpen(false)
                      ;(event.target as HTMLInputElement).blur()
                    }
                  }}
                  placeholder="Search companies, projects, tasks..."
                  className="w-full bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>

              {isSearchOpen && searchQuery.trim() && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {isSearching && (
                    <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                  )}
                  {searchError && (
                    <div className="px-4 py-3 text-sm text-rose-600">{searchError}</div>
                  )}
                  {!isSearching && !searchError && !hasResults && (
                    <div className="px-4 py-3 text-sm text-slate-500">No results found.</div>
                  )}
                  {!isSearching && !searchError && hasResults && (
                    <div className="max-h-80 overflow-y-auto">
                      {searchSections.map((section) =>
                        section.items.length ? (
                          <div key={section.label} className="border-t border-slate-100 first:border-t-0">
                            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              {section.label}
                            </div>
                            {section.items.map((item) => (
                              <Link
                                key={`${section.label}-${item.id}`}
                                to={item.href}
                                onClick={() => {
                                  setIsSearchOpen(false)
                                  setSearchQuery('')
                                }}
                                className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <div className="font-medium text-slate-900">{item.label}</div>
                                {item.description && (
                                  <div className="mt-0.5 text-xs text-slate-500">{item.description}</div>
                                )}
                              </Link>
                            ))}
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
