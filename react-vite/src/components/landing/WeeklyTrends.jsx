import { useLanguage } from '../../contexts/LanguageContext'

export default function WeeklyTrends() {
  const { t } = useLanguage()
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const heights = [40, 65, 55, 85, 70, 30, 20]

  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-10">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">query_stats</span>
          {t('landing.weeklyTrends')}
        </h3>
        <select className="bg-white dark:bg-slate-800 border-outline-variant dark:border-slate-700 text-xs font-bold rounded-lg py-2 px-4 shadow-sm outline-none focus:border-primary text-on-surface dark:text-slate-200">
          <option>{t('landing.last7Days')}</option>
          <option>{t('landing.last30Days')}</option>
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
        <div className="lg:col-span-2">
          <div className="flex items-end justify-between h-56 gap-5 px-6">
            {weekDays.map((day, i) => {
              const isPeak = i === 3
              return (
                <div
                  key={day}
                  className={`flex-1 rounded-t-lg relative group cursor-pointer transition-all ${
                    isPeak
                      ? 'bg-primary shadow-lg shadow-primary/20'
                      : 'bg-slate-200/50 dark:bg-slate-700/50 hover:bg-primary/20'
                  }`}
                  style={{ height: `${heights[i]}%` }}
                >
                  {isPeak && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[11px] font-extrabold text-primary whitespace-nowrap">
                      +12% {t('landing.peak')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-5 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-6">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>

        <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl space-y-5 border border-white dark:border-slate-700 shadow-inner">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('landing.cybercrimeAlerts')}</span>
            <span className="text-xs font-bold text-error">+24%</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('landing.narcoticsArrests')}</span>
            <span className="text-xs font-bold text-primary">+15%</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('landing.organizedBurglary')}</span>
            <span className="text-xs font-bold text-slate-400">-8%</span>
          </div>
          <button className="w-full py-3.5 text-xs font-extrabold text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors rounded-xl border border-primary/10">
            {t('landing.viewFullReport')}
          </button>
        </div>
      </div>
    </section>
  )
}
