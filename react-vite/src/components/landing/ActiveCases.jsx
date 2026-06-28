import { useLanguage } from '../../contexts/LanguageContext'

export default function ActiveCases() {
  const { t } = useLanguage()
  const cases = [
    { fir: 'FIR-2026-0012', title: 'Organized Retail Theft Ring', progress: 75, time: '2h ago' },
    { fir: 'FIR-2026-0045', title: 'Financial Fraud - Crypto Mixer', progress: 25, time: '5h ago' },
    { fir: 'FIR-2026-0089', title: 'Unauthorized Border Crossing', progress: 50, time: '1d ago' },
  ]

  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">folder_open</span>
          {t('landing.activeCases')}
        </h3>
        <span className="bg-primary/10 text-primary text-[11px] px-4 py-1.5 rounded-full font-extrabold uppercase tracking-widest">
          {t('landing.totalInvestigations')}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cases.map((c) => (
          <div
            key={c.fir}
            className="p-5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white dark:border-slate-700 hover:border-primary/20 transition-all cursor-pointer group"
          >
            <div className="flex justify-between mb-3">
              <span className="text-xs font-bold text-primary">{c.fir}</span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{c.time}</span>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.title}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${c.progress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{c.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
