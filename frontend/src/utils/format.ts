const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

/**
 * 金額を日本円フォーマットで表示
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return currencyFormatter.format(value)
}
