import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { api } from '../../services/api'

const NetworkGraph = lazy(() => import('../workspace/visualizations/NetworkGraph'))

function GraphFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-on-surface-variant/60 dark:text-slate-400">Loading network graph...</p>
      </div>
    </div>
  )
}

export default function CriminalNetworkViz() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [networkData, setNetworkData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getCNAFullNetwork()
      .then(res => {
        if (cancelled) return
        if (res.success) {
          setNetworkData({
            nodes: res.nodes || [],
            edges: res.edges || [],
            metrics: res.metrics || {},
            communities: res.communities || {},
          })
        } else {
          setError(res.error || 'Failed to load network')
        }
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load network')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">share</span>
          {t('landing.criminalNetwork')}
        </h3>
      </div>
      <div className="h-96 rounded-2xl overflow-hidden border border-outline-variant dark:border-slate-700">
        {loading ? (
          <GraphFallback />
        ) : error ? (
          <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <div className="text-center">
              <p className="text-sm text-on-surface-variant/60 dark:text-slate-400 mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <Suspense fallback={<GraphFallback />}>
            <NetworkGraph data={networkData} />
          </Suspense>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => navigate('/analytics')}
          className="py-3 px-6 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors"
        >
          {t('landing.fullNetworkView')}
        </button>
      </div>
    </section>
  )
}
