import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchCrimeTrends } from '../services/crimeTrendsService'

const CACHE_TTL = 5 * 60 * 1000
const REFRESH_INTERVAL = 5 * 60 * 1000

function cacheKey(y, m) {
  return m ? `m_${y}_${m}` : `y_${y}`
}

export default function useCrimeTrends() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
  const refreshTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async (y, m, isRetry = false) => {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const key = cacheKey(y, m)
    const cached = cacheRef.current.get(key)
    if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
      setData(cached.data)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    const params = m ? { year: y, month: m } : { year: y }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchCrimeTrends(params, controller.signal)
      if (!mountedRef.current) return

      cacheRef.current.set(key, { data: result, fetchedAt: Date.now() })
      setData(result)
      setLoading(false)
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return
      if (!mountedRef.current) return

      if (!isRetry) {
        return fetchData(y, m, true)
      }

      const cached = cacheRef.current.get(key)
      if (cached) {
        setData(cached.data)
      }
      setError(err)
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    const key = cacheKey(year, month)
    cacheRef.current.delete(key)
    fetchData(year, month)
  }, [year, month, fetchData])

  useEffect(() => {
    mountedRef.current = true
    fetchData(year, month)

    refreshTimerRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchData(year, month)
      }
    }, REFRESH_INTERVAL)

    return () => {
      mountedRef.current = false
      if (abortRef.current) {
        abortRef.current.abort()
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [year, month, fetchData])

  return { data, loading, error, refresh, year, setYear, month, setMonth }
}
