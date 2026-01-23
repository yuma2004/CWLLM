import { useEffect, useId, useRef, useState } from 'react'
import { useFetch } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { apiRoutes } from '../lib/apiRoutes'
import FormInput from './ui/FormInput'
import CloseIcon from './ui/CloseIcon'

type BaseOption = { id: string; name: string }

type SearchSelectProps<T extends BaseOption> = {
  value: string
  onChange: (id: string, option?: T) => void
  searchEndpoint: string
  detailEndpoint: (id: string) => string
  responseKey: string
  label?: string
  placeholder?: string
  disabled?: boolean
  name?: string
  autoComplete?: string
  errorMessageDetail?: string
  errorMessageSearch?: string
}

function SearchSelect<T extends BaseOption>({
  value,
  onChange,
  searchEndpoint,
  detailEndpoint,
  responseKey,
  label,
  placeholder = '検索',
  disabled = false,
  name,
  autoComplete = 'off',
  errorMessageDetail = '取得に失敗しました',
  errorMessageSearch = '検索に失敗しました',
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<T | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const debouncedQuery = useDebouncedValue(query.trim(), 300)

  const { data: selectedData } = useFetch<Record<string, T>>(
    value ? detailEndpoint(value) : null,
    {
      enabled: Boolean(value),
      errorMessage: errorMessageDetail,
      cacheTimeMs: 30_000,
    }
  )

  const searchUrl =
    isOpen && debouncedQuery
      ? `${searchEndpoint}?${new URLSearchParams({ q: debouncedQuery, limit: '20' })}`
      : null

  const { data: searchData, isLoading: isSearching } = useFetch<{ items: T[] }>(
    searchUrl,
    {
      enabled: Boolean(searchUrl),
      errorMessage: errorMessageSearch,
      cacheTimeMs: 5_000,
    }
  )

  const options = searchData?.items ?? []

  useEffect(() => {
    if (!value) {
      setSelected(null)
      return
    }
    if (selected?.id === value) return
    const item = selectedData?.[responseKey]
    if (item) {
      setSelected(item)
      setQuery(item.name)
    }
  }, [selected?.id, selectedData, value, responseKey])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleClear = () => {
    setQuery('')
    setSelected(null)
    onChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-slate-600">
          {label}
        </label>
      )}
      <FormInput
        id={inputId}
        name={name}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          setSelected(null)
          onChange('')
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-label={label ? undefined : placeholder}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
          onClick={handleClear}
          aria-label="選択をクリア"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          {isSearching ? (
            <div className="px-3 py-2 text-xs text-slate-500">検索中…</div>
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

// Pre-configured exports for Company and Project
type CompanyOption = { id: string; name: string }
type ProjectOption = { id: string; name: string }

type SimpleSearchSelectProps<T extends BaseOption> = {
  value: string
  onChange: (id: string, option?: T) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  name?: string
  autoComplete?: string
}

export const CompanySearchSelect = ({
  placeholder = '企業名で検索',
  ...props
}: SimpleSearchSelectProps<CompanyOption>) => (
  <SearchSelect
    {...props}
    placeholder={placeholder}
    searchEndpoint={apiRoutes.companies.search()}
    detailEndpoint={(id) => apiRoutes.companies.detail(id)}
    responseKey="company"
    errorMessageDetail="企業の取得に失敗しました"
  />
)

export const ProjectSearchSelect = ({
  placeholder = '案件名で検索',
  ...props
}: SimpleSearchSelectProps<ProjectOption>) => (
  <SearchSelect
    {...props}
    placeholder={placeholder}
    searchEndpoint={apiRoutes.projects.search()}
    detailEndpoint={(id) => apiRoutes.projects.detail(id)}
    responseKey="project"
    errorMessageDetail="案件の取得に失敗しました"
  />
)

export default SearchSelect
