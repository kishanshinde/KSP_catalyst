function parseSafeDate(date) {
  if (date == null) return null
  const d = new Date(date)
  return isNaN(d.getTime()) ? null : d
}

export function formatDate(date, locale = 'en-IN') {
  const d = parseSafeDate(date)
  if (!d) return ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatTime(date, locale = 'en-IN') {
  const d = parseSafeDate(date)
  if (!d) return ''
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatDateTime(date, locale = 'en-IN') {
  const d = parseSafeDate(date)
  if (!d) return ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatNumber(num, locale = 'en-IN') {
  return new Intl.NumberFormat(locale).format(num)
}

export function truncate(str, max = 50) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

export function generateId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
}
