import { useLanguage } from '../../contexts/LanguageContext'

export default function SuggestedThreads({ onSelect }) {
  const { t } = useLanguage()
  const threads = [
    '"Show all repeat offenders connected to FIR-2026-0012"',
    '"Analyze crime trends in Bengaluru East"',
    '"Find financial links in cybercrime cases"',
  ]

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <p className="w-full text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{t('landing.suggestedThreads')}</p>
      {threads.map((t, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(t.replace(/"/g, ''))}
          className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-white dark:border-slate-700 hover:border-primary/30 hover:bg-white dark:hover:bg-slate-700 hover:text-primary transition-all shadow-sm"
        >
          {t}
        </button>
      ))}
    </div>
  )
}
