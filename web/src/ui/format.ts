export const formatElapsed = (elapsedMs: number): string => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':')
}

export const formatPrice = (value: number): string =>
  Number.isFinite(value) && value > 0 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'
