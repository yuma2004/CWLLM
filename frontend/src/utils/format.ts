/**
 * 金額を日本円フォーマットで表示
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return `¥${value.toLocaleString()}`
}
