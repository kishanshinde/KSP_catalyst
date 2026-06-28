import { useLanguage } from '../../../contexts/LanguageContext'

export default function HeatMap({ data }) {
  const { t } = useLanguage()

  if (!data?.hotspots) {
    return <div className="text-on-surface-variant/60 dark:text-slate-500 text-sm">{t('workspace.noData')}</div>
  }

  const levelColor = {
    high: 'bg-error/20 text-error border-error/30',
    medium: 'bg-amber-100/40 text-amber-700 border-amber-300/30',
    low: 'bg-emerald-100/40 text-emerald-700 border-emerald-300/30',
  }

  const maxCount = Math.max(...data.hotspots.map((h) => h.count))

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider">
            {t('workspace.crimeConcentration')}
          </span>
          <span className="text-xs text-on-surface-variant/40 dark:text-slate-500">{data.hotspots.length} {t('workspace.locations')}</span>
        </div>
        <div className="space-y-2">
          {data.hotspots.map((h) => (
            <div key={h.location} className="flex items-center gap-3">
              <span className="text-sm w-36 shrink-0 text-on-surface dark:text-slate-200">{h.location}</span>
              <div className="flex-1 h-2 bg-surface-container-highest dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    h.level === 'high' ? 'bg-error/50' :
                    h.level === 'medium' ? 'bg-amber-400/50' :
                    'bg-emerald-400/50'
                  }`}
                  style={{ width: `${(h.count / maxCount) * 100}%` }}
                />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${levelColor[h.level] || levelColor.low}`}>
                {h.count}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-on-surface-variant/60 dark:text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-error/50" /> {t('workspace.high')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400/50" /> {t('workspace.medium')}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400/50" /> {t('workspace.low')}</span>
      </div>
    </div>
  )
}
