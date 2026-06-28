export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function getWorkspaceTypeFromIntent(intent) {
  const map = {
    search_fir: 'chart',
    search_accused: 'profile',
    search_victim: 'profile',
    search_location: 'heatmap',
    criminal_history: 'profile',
    fir_accused: 'profile',
    fir_victims: 'profile',
    fir_investigation: 'timeline',
    crime_hotspots: 'heatmap',
    crime_trends: 'trend',
    crime_pattern: 'chart',
    repeat_offenders: 'chart',
    criminal_network: 'network',
    offender_profile: 'profile',
    financial_analysis: 'financial',
    case_summary: 'chart',
    similar_cases: 'chart',
    investigation_timeline: 'timeline',
    risk_analysis: 'profile',
    forecast: 'trend',
    dashboard: 'chart',
  }
  return map[intent] || 'chart'
}

export function extractName(text) {
  const patterns = [
    /(?:of|about|for|find|search)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:history|profile|network)\s+(?:of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[1]
  }
  return null
}

export function extractFirNumber(text) {
  const m = text.match(/(FIR[-\s]?\d{4}[-\s]?\d{3,4})/i)
  return m ? m[1].toUpperCase() : null
}
