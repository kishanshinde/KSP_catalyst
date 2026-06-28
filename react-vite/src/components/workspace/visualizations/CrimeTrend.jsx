import { useLanguage } from '../../../contexts/LanguageContext'

export default function CrimeTrend({ data }) {
  const { t } = useLanguage()

  if (!data?.months) {
    return <div className="text-on-surface-variant/60 dark:text-slate-500 text-sm">{t('workspace.noData')}</div>
  }

  const max = Math.max(...data.values)

  const trendLabel = {
    rising: t('workspace.rising'),
    declining: t('workspace.declining'),
    stable: t('workspace.stable'),
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider">
            {t('workspace.monthlyTrend')}
          </span>
          {data.percentChange != null && (
            <span className={`text-xs font-semibold ${data.percentChange < 0 ? 'text-emerald-600' : 'text-error'}`}>
              {data.percentChange > 0 ? '+' : ''}{data.percentChange}%
            </span>
          )}
        </div>

        <div className="flex items-end gap-2 h-40">
          {data.months.map((month, i) => {
            const val = data.values[i]
            const height = (val / max) * 100
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400">{val}</span>
                <div
                  className={`w-full rounded-t transition-all duration-500 ${
                    data.trend === 'declining' ? 'bg-emerald-400/60' :
                    data.trend === 'rising' ? 'bg-error/60' :
                    'bg-primary/40'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-on-surface-variant/40 dark:text-slate-500">{month}</span>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-on-surface-variant/40 dark:text-slate-500 mt-3 pt-2 border-t border-slate-200/20 dark:border-slate-700/20">
          {t('workspace.trend')}: {trendLabel[data.trend] || data.trend || t('workspace.stable')}
        </p>
      </div>
    </div>
  )
}
