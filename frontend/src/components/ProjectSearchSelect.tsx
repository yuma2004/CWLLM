import { useEffect, useRef, useState } from 'react'
import { useFetch } from '../hooks/useApi'

type ProjectOption = {
  id: string
  name: string
}

type ProjectSearchSelectProps = {
  value: string
  onChange: (projectId: string, option?: ProjectOption) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

const ProjectSearchSelect = ({
  value,
  onChange,
  label,
  placeholder = '案件名で検索',
  disabled = false,
}: ProjectSearchSelectProps) => {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ProjectOption | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: selectedData } = useFetch<{ project: ProjectOption }>(
    value ? `/api/projects/${value}` : null,
    {
      enabled: Boolean(value),
      errorMessage: '案件の取得に失敗しました',
      cacheTimeMs: 30_000,
    }
  )

  const searchUrl =
    isOpen && debouncedQuery
      ? `/api/projects/search?${new URLSearchParams({
          q: debouncedQuery,
          limit: '20',
        }).toString()}`
      : null

  const { data: searchData, isLoading: isSearching } = useFetch<{
    items: ProjectOption[]
  }>(searchUrl, {
    enabled: Boolean(searchUrl),
    errorMessage: '検索に失敗しました',
    cacheTimeMs: 5_000,
  })

  const options = searchData?.items ?? []

  useEffect(() => {
    if (!value) {
      setSelected(null)
      return
    }
    if (selected?.id === value) return
    if (selectedData?.project) {
      setSelected(selectedData.project)
      setQuery(selectedData.project.name)
    }
  }, [selected?.id, selectedData, value])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      )}
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value
          setQuery(nextQuery)
          setIsOpen(true)
          setSelected(null)
          onChange('')
        }}
        onFocus={() => {
          setIsOpen(true)
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={() => {
            setQuery('')
            setSelected(null)
            onChange('')
          }}
          aria-label="clear"
        >
          ﾃ・        </button>
      )}
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          {isSearching ? (
            <div className="px-3 py-2 text-xs text-slate-500">検索中...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">候補がありません</div>
          ) : (
            <ul className="max-h-48 overflow-auto py-1 text-sm">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setSelected(option)
                      setQuery(option.name)
                      setIsOpen(false)
                      onChange(option.id, option)
                    }}
                  >
                    {option.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectSearchSelect
