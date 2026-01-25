import { cn } from '../../lib/cn'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5
    const halfShow = Math.floor(showPages / 2)

    if (totalPages <= showPages + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      const start = Math.max(2, page - halfShow)
      const end = Math.min(totalPages - 1, page + halfShow)

      if (start > 2) {
        pages.push('ellipsis')
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis')
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (total === 0) return null

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Info */}
      <div className="text-sm text-slate-500">
        <span className="font-medium text-slate-700 tabular-nums">{total.toLocaleString()}</span>
        件中{' '}
        <span className="font-medium text-slate-700 tabular-nums">{startItem.toLocaleString()}</span>
        -
        <span className="font-medium text-slate-700 tabular-nums">{endItem.toLocaleString()}</span>
        件を表示
      </div>

      <div className="flex items-center gap-4">
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-slate-500">
              表示件数:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus-visible:border-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}件
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Numbers */}
        <nav className="flex items-center gap-1" aria-label="ページネーション">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={cn(
              'flex size-8 items-center justify-center rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40',
              page === 1
                ? 'cursor-not-allowed text-slate-300'
                : 'text-slate-600 hover:bg-slate-100'
            )}
            aria-label="前のページ"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((pageNum, index) =>
            pageNum === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40',
                  page === pageNum
                    ? 'bg-notion-accent text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
                aria-current={page === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            )
          )}

          {/* Next Button */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className={cn(
              'flex size-8 items-center justify-center rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/40',
              page === totalPages
                ? 'cursor-not-allowed text-slate-300'
                : 'text-slate-600 hover:bg-slate-100'
            )}
            aria-label="次のページ"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  )
}
