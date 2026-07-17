import { useState, lazy, Suspense, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import useCriminalNetwork from '../hooks/useCriminalNetwork'
import NetworkMetrics from '../components/workspace/visualizations/NetworkMetrics'
import CommunityView from '../components/workspace/visualizations/CommunityView'
import NodeDetailPanel from '../components/workspace/visualizations/NodeDetailPanel'

const NetworkGraph = lazy(() => import('../components/workspace/visualizations/NetworkGraph'))

const TABS = [
  { id: 'graph', labelKey: 'workspace.networkConnections', icon: 'share' },
  { id: 'metrics', labelKey: 'workspace.networkOverview', icon: 'analytics' },
  { id: 'community', labelKey: 'workspace.detectedCommunities', icon: 'group_work' },
]

const SEARCH_TYPES = [
  { value: 'name', label: 'Name' },
  { value: 'fir_number', label: 'FIR Number' },
  { value: 'location', label: 'Location' },
]

function GraphFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-on-surface-variant/60 dark:text-slate-400">Loading network graph...</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="glass rounded-xl p-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="glass rounded-xl p-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="flex-1" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="glass rounded-xl p-8 text-center">
      <span className="material-symbols-outlined text-red-400 text-4xl mb-3 block">error</span>
      <p className="text-sm text-on-surface-variant/60 dark:text-slate-400 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

function SummaryDashboard({ summary }) {
  const { t } = useLanguage()
  if (!summary) return null

  return (
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="glass rounded-xl p-4">
        <div className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider mb-3">
          Network Summary
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">{summary.totalActors || 0}</p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">Key Actors</p>
          </div>
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">{summary.totalFIRs || 0}</p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">{t('workspace.firs') || 'FIRs'}</p>
          </div>
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">{summary.totalCrimeTypes || 0}</p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">Crime Types</p>
          </div>
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">
              {summary.dominantCrimeTypes?.length || 0}
            </p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">Categories</p>
          </div>
        </div>
      </div>

      {/* Top Actors */}
      {summary.topActors?.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider mb-3">
            Top Key Actors
          </div>
          <div className="space-y-2">
            {summary.topActors.map((actor, i) => (
              <div key={actor.id || i} className="flex items-center gap-3 py-1.5">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-on-surface dark:text-white truncate">{actor.label}</div>
                  <div className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">
                    {actor.gender || 'Unknown'} &middot; {actor.occupation || 'Unknown'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 w-10 text-right">
                  {(actor.composite_score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dominant Crime Types */}
      {summary.dominantCrimeTypes?.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider mb-3">
            Dominant Crime Types
          </div>
          <div className="space-y-2">
            {summary.dominantCrimeTypes.map((ct, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{
                  backgroundColor: `hsl(${(i * 72) % 360}, 70%, 60%)`
                }} />
                <div className="flex-1 text-sm text-on-surface dark:text-white">{ct.name}</div>
                <span className="text-[10px] text-slate-500">{ct.count} FIRs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('graph')
  const [searchType, setSearchType] = useState('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDetailPanel, setShowDetailPanel] = useState(false)

  const {
    summary,
    networkData,
    loading,
    error,
    selectedNode,
    setSelectedNode,
    loadSummary,
    searchNetwork,
    retry,
  } = useCriminalNetwork()

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    searchNetwork(searchType, searchQuery.trim())
  }

  const handleNodeSelect = (node) => {
    setSelectedNode(node)
    setShowDetailPanel(!!node)
  }

  const handleCloseDetail = () => {
    setSelectedNode(null)
    setShowDetailPanel(false)
  }

  const hasNetworkData = networkData && networkData.nodes && networkData.nodes.length > 0
  const graphNodeCount = networkData?.nodes?.length || 0
  const graphEdgeCount = networkData?.edges?.length || 0

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden">
      {/* Header + Search */}
      <div className="flex items-center gap-3 mb-2">
        <span className="material-symbols-outlined text-primary text-2xl">hub</span>
        <h1 className="text-xl font-bold text-on-surface dark:text-white">
          {t('sidebar.criminalNetworks')}
        </h1>
        {hasNetworkData && (
          <span className="text-xs text-on-surface-variant/50 dark:text-slate-500 ml-2">
            {graphNodeCount} {t('workspace.nodes')} &middot; {graphEdgeCount} {t('workspace.edges')}
          </span>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-3 py-2 text-xs bg-white/40 dark:bg-slate-800/40 border border-outline-variant dark:border-slate-700 rounded-lg text-on-surface dark:text-white focus:outline-none focus:border-primary"
        >
          {SEARCH_TYPES.map(st => (
            <option key={st.value} value={st.value}>{st.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search by ${SEARCH_TYPES.find(s => s.value === searchType)?.label.toLowerCase() || 'name'}...`}
          className="flex-1 px-3 py-2 text-xs bg-white/40 dark:bg-slate-800/40 border border-outline-variant dark:border-slate-700 rounded-lg text-on-surface dark:text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading || !searchQuery.trim()}
          className="px-4 py-2 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">search</span>
        </button>
      </form>

      {/* Tabs */}
      {hasNetworkData && (
        <div className="flex gap-1 bg-white/40 dark:bg-slate-800/40 rounded-xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant/60 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-700/40'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto flex">
        <div className={`flex-1 ${showDetailPanel ? 'pr-0' : ''}`}>
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : hasNetworkData ? (
            <div className="flex h-full">
              <div className="flex-1">
                {activeTab === 'graph' && (
                  <div className="h-full min-h-[500px]">
                    <Suspense fallback={<GraphFallback />}>
                      <NetworkGraph data={networkData} onNodeSelect={handleNodeSelect} />
                    </Suspense>
                  </div>
                )}
                {activeTab === 'metrics' && <NetworkMetrics data={networkData} />}
                {activeTab === 'community' && <CommunityView data={networkData} />}
              </div>

              {/* Node Detail Panel */}
              {showDetailPanel && selectedNode && (
                <div className="w-72 h-full">
                  <NodeDetailPanel
                    node={selectedNode}
                    edges={networkData.edges}
                    allNodes={networkData.nodes}
                    onClose={handleCloseDetail}
                  />
                </div>
              )}
            </div>
          ) : (
            <SummaryDashboard summary={summary} />
          )}
        </div>
      </div>
    </div>
  )
}
