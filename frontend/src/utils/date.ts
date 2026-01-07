type DateInput = string | Date | null | undefined

const DEFAULT_FALLBACK = '-'

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_PREFIX_PATTERN = /^\d{4}-\d{2}-\d{2}/

const formatLocalYmd = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createLocalDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day)

const normalizeToLocalDate = (value: DateInput) => {
  if (!value) return null

  if (typeof value === 'string') {
    if (DATE_ONLY_PATTERN.test(value)) {
      const [year, month, day] = value.split('-').map(Number)
      return createLocalDate(year, month, day)
    }

    if (DATE_PREFIX_PATTERN.test(value)) {
      const [year, month, day] = value.slice(0, 10).split('-').map(Number)
      return createLocalDate(year, month, day)
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return createLocalDate(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    )
  }

  if (Number.isNaN(value.getTime())) return null
  return createLocalDate(
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate(),
  )
}

export const formatDate = (value: DateInput, fallback = DEFAULT_FALLBACK) => {
  const date = normalizeToLocalDate(value)
  if (!date) return fallback
  return date.toLocaleDateString('ja-JP')
}

export const formatDateInput = (value: DateInput) => {
  if (!value) return ''

  if (typeof value === 'string') {
    if (DATE_ONLY_PATTERN.test(value)) return value
    if (DATE_PREFIX_PATTERN.test(value)) return value.slice(0, 10)
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return formatLocalYmd(parsed)
  }

  if (Number.isNaN(value.getTime())) return ''
  return formatLocalYmd(value)
}

export const formatDateGroup = (dateStr: string) => {
  const date = normalizeToLocalDate(dateStr)
  if (!date) return DEFAULT_FALLBACK

  if (isToday(date)) {
    return '今日'
  }
  if (isYesterday(date)) {
    return '昨日'
  }
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const isToday = (value: DateInput) => {
  const date = normalizeToLocalDate(value)
  if (!date) return false
  return formatLocalYmd(date) === formatLocalYmd(new Date())
}

export const isYesterday = (value: DateInput) => {
  const date = normalizeToLocalDate(value)
  if (!date) return false
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatLocalYmd(date) === formatLocalYmd(yesterday)
}
