import { api } from './api'

export function fetchRecentCases(signal) {
  return api.getRecentCases({ signal })
}
