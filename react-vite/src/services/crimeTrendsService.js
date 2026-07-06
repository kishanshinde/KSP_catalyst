import { api } from './api'

export function fetchCrimeTrends(params, signal) {
  return api.getCrimeTrends(params, { signal })
}

export async function generateReport(data) {
  const { blob } = await api.generateCrimeTrendsReport(data)
  return blob
}
