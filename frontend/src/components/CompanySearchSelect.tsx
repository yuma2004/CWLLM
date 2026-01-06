import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/apiClient'

type CompanyOption = {
  id: string
  name: string
}

type CompanySearchSelectProps = {
  value: string
  onChange: (companyId: string, option?: CompanyOption) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

const CompanySearchSelect = ({
  value,
  onChange,
  label,
  placeholder = '企業名で検索',
  disabled = false,
}: CompanySearchSelectProps) => {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<CompanyOption[]>([])
  const [selected, setSelected] = useState<CompanyOption | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadSelected = useCallback(async () => {
    if (!value) {
      setSelected(null)
      setQuery('')
      return
    }
    if (selected?.id === value) return
    try {
      const data = await apiRequest<{ company: CompanyOption }>(`/api/companies/${value}`)
      setSelected(data.company)
      setQuery(data.company.name)
    } catch {
      setSelected(null)
    }
  }, [selected?.id, value])

  const searchCompanies = useCallback(
    async (keyword: string) => {
      if (!keyword.trim()) {
        setOptions([])
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ q: keyword.trim(), limit: '20' })
        const data = await apiRequest<{ items: CompanyOption[] }>(
          `/api/companies/search?${params.toString()}`,
          { signal: controller.signal }
        )
        setOptions(data.items ?? [])
      } catch {
        setOptions([])
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    void loadSelected()
  }, [loadSelected])

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
          void searchCompanies(nextQuery)
        }}
        onFocus={() => {
          setIsOpen(true)
          if (query.trim()) {
            void searchCompanies(query)
          }
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
            setOptions([])
            onChange('')
          }}
          aria-label="clear"
        >
          ×
        </button>
      )}
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
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

export default CompanySearchSelect
