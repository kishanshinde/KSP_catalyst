export function formatDate(date, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateTime(date, locale = 'en-IN') {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
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
