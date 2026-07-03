import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchRecentCases } from '../services/recentCasesService'

const CACHE_TTL = 5 * 60 * 1000
const REFRESH_INTERVAL = 5 * 60 * 1000

export default function useRecentCases() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cacheRef = useRef(null)
  const abortRef = useRef(null)
  const refreshTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async (isRetry = false) => {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const cached = cacheRef.current
    if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
      setData(cached.data)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const result = await fetchRecentCases(controller.signal)
      if (!mountedRef.current) return

      cacheRef.current = { data: result, fetchedAt: Date.now() }
      setData(result)
      setLoading(false)
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return
      if (!mountedRef.current) return

      if (!isRetry) {
        return fetchData(true)
      }

      if (cacheRef.current) {
        setData(cacheRef.current.data)
      }
      setError(err)
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => {
    cacheRef.current = null
    fetchData()
  }, [fetchData])

  useEffect(() => {
    mountedRef.current = true
    fetchData()

    refreshTimerRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchData()
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
  }, [fetchData])

  return { data, loading, error, refresh }
}
