import { useState, useCallback } from 'react'
import { api } from '../services/api'

export default function useCriminalNetwork() {
  const [summary, setSummary] = useState(null)
  const [networkData, setNetworkData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [searchContext, setSearchContext] = useState(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCNASummary()
      if (res.success) {
        setSummary(res)
      } else {
        throw new Error(res.error || 'Failed to load summary')
      }
    } catch (err) {
      setError(err.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }, [])

  const searchNetwork = useCallback(async (searchType, searchQuery) => {
    setLoading(true)
    setError(null)
    setSearchContext({ searchType, searchQuery })
    try {
      const res = await api.searchCNANetwork({ searchType, searchQuery })
      if (res.success) {
        setNetworkData({
          nodes: res.nodes || [],
          edges: res.edges || [],
          metrics: res.metrics || {},
          communities: res.communities || {},
        })
      } else {
        throw new Error(res.error || 'Search failed')
      }
    } catch (err) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFullNetwork = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCNAFullNetwork()
      if (res.success) {
        setNetworkData({
          nodes: res.nodes || [],
          edges: res.edges || [],
          metrics: res.metrics || {},
          communities: res.communities || {},
        })
      } else {
        throw new Error(res.error || 'Failed to load network')
      }
    } catch (err) {
      setError(err.message || 'Failed to load network')
    } finally {
      setLoading(false)
    }
  }, [])

  const retry = useCallback(() => {
    if (searchContext) {
      searchNetwork(searchContext.searchType, searchContext.searchQuery)
    } else if (networkData) {
      loadFullNetwork()
    } else {
      loadSummary()
    }
  }, [searchContext, networkData, searchNetwork, loadFullNetwork, loadSummary])

  return {
    summary,
    networkData,
    loading,
    error,
    selectedNode,
    setSelectedNode,
    searchContext,
    loadSummary,
    searchNetwork,
    loadFullNetwork,
    retry,
  }
}
