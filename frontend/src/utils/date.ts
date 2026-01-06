type DateInput = string | Date | null | undefined

const DEFAULT_FALLBACK = '-'

export const formatDate = (value: DateInput, fallback = DEFAULT_FALLBACK) => {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString('ja-JP')
}

export const formatDateInput = (value: Date | null | undefined) => {
  if (!value) return ''
  if (Number.isNaN(value.getTime())) return ''
  return value.toISOString().slice(0, 10)
}

export const formatDateGroup = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return '今日'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨日'
  }
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
