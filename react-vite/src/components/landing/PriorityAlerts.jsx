import { useLanguage } from '../../contexts/LanguageContext'

export default function PriorityAlerts() {
  const { t } = useLanguage()
  const alerts = [
    {
      severity: 'critical',
      title: 'Unusual activity detected: ATM cluster #402 (Indiranagar)',
      description: 'High probability of skimming deployment. Nearby Unit #12 notified.',
      time: 'Detection: 2 mins ago',
      variant: 'critical',
    },
    {
      severity: 'intelligence',
      title: 'Cross-district suspect link found',
      description: 'Siddharth V. (Suspect) linked to FIR-2025-901 via vehicle registration match.',
      time: '42 mins ago',
      variant: 'intel',
    },
  ]

  const alertStyles = {
    critical: {
      border: 'border border-error/10',
      bg: 'bg-error-container/20 dark:bg-error/10',
      hover: 'hover:bg-error-container/40 dark:hover:bg-error/20',
      badge: 'text-error bg-error/10',
      text: 'text-error',
      btnBg: 'bg-white dark:bg-slate-800',
      btnHover: 'hover:bg-error hover:text-white',
    },
    intel: {
      border: 'border border-primary/10',
      bg: 'bg-primary/5 dark:bg-primary/10',
      hover: 'hover:bg-primary/10 dark:hover:bg-primary/20',
      badge: 'text-primary bg-primary/10',
      text: 'text-primary',
      btnBg: 'bg-white dark:bg-slate-800',
      btnHover: 'hover:bg-primary hover:text-white',
    },
  }

  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">warning</span>
          {t('landing.priorityAlerts')}
        </h3>
        <button className="text-xs font-extrabold text-primary hover:underline uppercase tracking-wider">
          {t('landing.markAllAsSeen')}
        </button>
      </div>
      <div className="space-y-4">
        {alerts.map((a, i) => {
          const s = alertStyles[a.variant] || alertStyles.intel
          return (
            <div
              key={i}
              className={`${s.border} ${s.bg} ${s.hover} p-5 rounded-2xl flex justify-between items-center group transition-all cursor-pointer`}
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[9px] font-extrabold ${s.badge} px-3 py-1 rounded-full uppercase tracking-widest`}>
                    {a.severity === 'critical' ? t('landing.critical') : t('landing.intelligence')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{a.time}</span>
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{a.description}</p>
              </div>
              <button className={`p-3 rounded-full ${s.btnBg} ${s.text} shadow-sm ${s.btnHover} transition-all`}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
