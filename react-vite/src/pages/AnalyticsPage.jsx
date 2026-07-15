import { useState, lazy, Suspense } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import NetworkMetrics from '../components/workspace/visualizations/NetworkMetrics'
import ShortestPath from '../components/workspace/visualizations/ShortestPath'
import CommunityView from '../components/workspace/visualizations/CommunityView'
import { mockCriminalNetworkData } from '../services/mockCriminalNetwork'

const NetworkGraph = lazy(() => import('../components/workspace/visualizations/NetworkGraph'))

const TABS = [
  { id: 'graph', labelKey: 'workspace.networkConnections', icon: 'share' },
  { id: 'metrics', labelKey: 'workspace.networkOverview', icon: 'analytics' },
  { id: 'path', labelKey: 'workspace.findPath', icon: 'route' },
  { id: 'community', labelKey: 'workspace.detectedCommunities', icon: 'group_work' },
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

export default function AnalyticsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('graph')

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden">
      <div className="flex items-center gap-3 mb-2">
        <span className="material-symbols-outlined text-primary text-2xl">hub</span>
        <h1 className="text-xl font-bold text-on-surface dark:text-white">
          {t('sidebar.criminalNetworks')}
        </h1>
        <span className="text-xs text-on-surface-variant/50 dark:text-slate-500 ml-2">
          {mockCriminalNetworkData.nodes.length} {t('workspace.nodes')} &middot; {mockCriminalNetworkData.edges.length} {t('workspace.edges')}
        </span>
      </div>

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

      <div className="flex-1 overflow-auto">
        {activeTab === 'graph' && (
          <div className="h-full min-h-[500px]">
            <Suspense fallback={<GraphFallback />}>
              <NetworkGraph data={mockCriminalNetworkData} />
            </Suspense>
          </div>
        )}
        {activeTab === 'metrics' && <NetworkMetrics data={mockCriminalNetworkData} />}
        {activeTab === 'path' && <ShortestPath data={mockCriminalNetworkData} />}
        {activeTab === 'community' && <CommunityView data={mockCriminalNetworkData} />}
      </div>
    </div>
  )
}
