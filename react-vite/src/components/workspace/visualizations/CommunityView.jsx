import { useLanguage } from '../../../contexts/LanguageContext'

const COMMUNITY_PALETTE = [
  { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/25', dot: 'bg-red-500' },
  { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/25', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-500' },
  { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25', dot: 'bg-purple-500' },
  { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/25', dot: 'bg-pink-500' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25', dot: 'bg-cyan-500' },
]

export default function CommunityView({ data }) {
  const { t } = useLanguage()

  if (!data?.communities || Object.keys(data.communities).length === 0) {
    return <div className="text-on-surface-variant/60 dark:text-slate-500 text-sm">{t('workspace.noData')}</div>
  }

  const communities = Object.values(data.communities).sort((a, b) => b.size - a.size)

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider">
            {t('workspace.detectedCommunities') || 'Detected Communities'}
          </span>
          <span className="text-xs text-on-surface-variant/40 dark:text-slate-500">
            {communities.length} {t('workspace.clusters') || 'clusters'}
          </span>
        </div>

        <div className="space-y-3">
          {communities.map((comm, i) => {
            const palette = COMMUNITY_PALETTE[i % COMMUNITY_PALETTE.length]
            return (
              <div key={i} className={`rounded-lg border ${palette.border} ${palette.bg} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${palette.dot}`} />
                    <span className={`text-sm font-medium ${palette.text}`}>
                      {t('workspace.community') || 'Community'} {i + 1}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{comm.size} {t('workspace.members') || 'members'}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="text-center">
                    <p className="text-lg font-bold text-on-surface dark:text-white">{comm.accused_count}</p>
                    <p className="text-[9px] text-slate-500">{t('workspace.accused') || 'Accused'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-on-surface dark:text-white">{comm.fir_count}</p>
                    <p className="text-[9px] text-slate-500">{t('workspace.firs') || 'FIRs'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-on-surface dark:text-white">{comm.avg_risk_score}</p>
                    <p className="text-[9px] text-slate-500">{t('workspace.avgRisk') || 'Avg Risk'}</p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400">
                  {t('workspace.dominant') || 'Dominant'}: {comm.dominant_crime}
                </div>

                {comm.members && comm.members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comm.members.filter(m => m.type === 'accused' || m.type === 'central').slice(0, 6).map(m => (
                      <span key={m.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/30 dark:bg-slate-800/30 text-slate-300">
                        {m.label}
                      </span>
                    ))}
                    {comm.members.length > 6 && (
                      <span className="text-[10px] text-slate-500">+{comm.members.length - 6}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
