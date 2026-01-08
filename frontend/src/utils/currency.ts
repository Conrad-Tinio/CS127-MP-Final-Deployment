export function parseCurrencyToNumber(value: string): number {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return 0

  // Validate basic numeric format
  if (!/^\d+(\.\d{0,})?$/.test(normalized)) {
    return 0
  }

  const [intPart, fracPart = ''] = normalized.split('.')
  const cents =
    parseInt(intPart, 10) * 100 +
    parseInt((fracPart + '00').slice(0, 2), 10)

  if (Number.isNaN(cents)) return 0

  return cents / 100
}

export function formatCurrencyInput(value: string): string {
  const amount = parseCurrencyToNumber(value)
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}





