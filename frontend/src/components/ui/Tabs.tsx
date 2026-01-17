import { useState, useEffect, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  children: (activeTab: string) => ReactNode
  syncWithHash?: boolean
}

export default function Tabs({
  tabs,
  defaultTab,
  onChange,
  children,
  syncWithHash = false,
}: TabsProps) {
  const getInitialTab = () => {
    if (syncWithHash) {
      const hash = window.location.hash.slice(1)
      if (tabs.some((t) => t.id === hash)) return hash
    }
    return defaultTab || tabs[0]?.id || ''
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  useEffect(() => {
    if (syncWithHash) {
      const handleHashChange = () => {
        const hash = window.location.hash.slice(1)
        if (tabs.some((t) => t.id === hash)) {
          setActiveTab(hash)
        }
      }
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [syncWithHash, tabs])

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
    if (syncWithHash) {
      window.location.hash = tabId
    }
  }

  return (
    <div className="w-full">
      {/* Tab List */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="タブ">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium',
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.icon && <span className="text-current">{tab.icon}</span>}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'ml-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">{children(activeTab)}</div>
    </div>
  )
}
