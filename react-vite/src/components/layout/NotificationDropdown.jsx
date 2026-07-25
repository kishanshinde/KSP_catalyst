import { useMemo } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import useRecentCases from '../../hooks/useRecentCases'

export default function NotificationDropdown() {
  const { t } = useLanguage()
  const { data, loading, error } = useRecentCases()

  const criticalCases = useMemo(
    () => (data?.recentCases || []).filter((c) => c.priority === 'Critical'),
    [data]
  )

  return (
    <div className="absolute right-0 mt-2 w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">warning</span>
          {t('landing.priorityAlerts')}
        </h3>
        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          {criticalCases.length} {t('landing.critical')}
        </span>
      </div>

      {loading && !data && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && !data && (
        <p className="text-xs text-red-500 font-medium py-4 text-center">
          {t('common.error') || 'Failed to load alerts'}
        </p>
      )}

      {data && criticalCases.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
          No critical FIRs right now.
        </p>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {criticalCases.map((c) => (
          <div key={c.firNumber} className="border border-error/10 bg-error-container/20 dark:bg-error/10 p-4 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[9px] font-extrabold text-error bg-error/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                {t('landing.critical')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{c.dateRegistered}</span>
            </div>
            <p className="text-xs font-mono font-bold text-primary">{c.firNumber}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-2">{c.description}</p>
            <span
              className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: c.statusColor, backgroundColor: `${c.statusColor}18` }}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
