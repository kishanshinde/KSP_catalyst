import { useLanguage } from '../../../contexts/LanguageContext'
import { mockCriminalNetworkData } from '../../../services/mockCriminalNetwork'

const ROLE_STYLES = {
  LEADER: 'bg-red-500/20 text-red-400 border-red-500/30',
  BROKER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  HUB: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  HABITUAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  MEMBER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export default function NetworkMetrics({ data }) {
  const { t } = useLanguage()

  const dataWithMock = data?.metrics ? data : mockCriminalNetworkData

  if (!dataWithMock?.metrics) {
    return <div className="text-on-surface-variant/60 dark:text-slate-500 text-sm">{t('workspace.noData')}</div>
  }

  const { metrics, communities, nodes } = dataWithMock
  const topActors = metrics.topActors || []

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="glass rounded-xl p-4">
        <div className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider mb-3">
          {t('workspace.networkOverview') || 'Network Overview'}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">{metrics.totalNodes}</p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">{t('workspace.nodes') || 'Nodes'}</p>
          </div>
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">{metrics.totalEdges}</p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">{t('workspace.edges') || 'Edges'}</p>
          </div>
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">{metrics.density}</p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">{t('workspace.density') || 'Density'}</p>
          </div>
          <div className="bg-white/40 dark:bg-slate-800/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface dark:text-white">{metrics.totalComponents}</p>
            <p className="text-[10px] text-on-surface-variant/60 dark:text-slate-400">{t('workspace.components') || 'Components'}</p>
          </div>
        </div>
      </div>

      {/* Key Actors */}
      {topActors.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider mb-3">
            {t('workspace.keyActors') || 'Key Actors'}
          </div>
          <div className="space-y-2">
            {topActors.slice(0, 8).map((actor, i) => (
              <div key={actor.id || i} className="flex items-center gap-3 py-1.5">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-on-surface dark:text-white truncate">{actor.label}</div>
                  <div className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">
                    {t('workspace.cases') || 'Cases'}: {actor.total_cases || '-'}
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded border ${ROLE_STYLES[actor.role] || ROLE_STYLES.MEMBER}`}>
                  {actor.role}
                </span>
                <span className="text-[10px] text-slate-500 w-10 text-right">
                  {(actor.composite_score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communities */}
      {communities && Object.keys(communities).length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider mb-3">
            {t('workspace.detectedCommunities') || 'Detected Communities'} ({Object.keys(communities).length})
          </div>
          <div className="space-y-2">
            {Object.values(communities).sort((a, b) => b.size - a.size).slice(0, 5).map((comm, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${(i * 60) % 360}, 70%, 60%)` }} />
                <div className="flex-1">
                  <div className="text-xs text-on-surface dark:text-white">
                    {t('workspace.community') || 'Community'} {i + 1}
                  </div>
                  <div className="text-[10px] text-on-surface-variant/60 dark:text-slate-500">
                    {comm.accused_count} {t('workspace.accused') || 'accused'} &middot; {comm.fir_count} {t('workspace.firs') || 'FIRs'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">
                  {comm.dominant_crime}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
