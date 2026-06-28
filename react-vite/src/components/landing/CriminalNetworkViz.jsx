import { useLanguage } from '../../contexts/LanguageContext'

export default function CriminalNetworkViz() {
  const { t } = useLanguage()

  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">share</span>
          {t('landing.criminalNetwork')}
        </h3>
      </div>
      <div className="flex gap-8">
        <div className="flex-1 h-80 relative border border-outline-variant dark:border-slate-700 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 dark:from-slate-800 to-white dark:to-slate-900">
          <svg viewBox="0 0 400 300" className="w-full h-full">
            <circle cx="200" cy="80" r="30" fill="#ef4444" opacity="0.8" />
            <text x="200" y="85" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">SUSPECT_A</text>
            <circle cx="120" cy="180" r="20" fill="#3b82f6" opacity="0.7" />
            <text x="120" y="185" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">ASSOC_1</text>
            <circle cx="280" cy="180" r="20" fill="#3b82f6" opacity="0.7" />
            <text x="280" y="185" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">ASSOC_2</text>
            <line x1="200" y1="110" x2="120" y2="160" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="200" y1="110" x2="280" y2="160" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="200" cy="250" r="15" fill="#94a3b8" opacity="0.6" />
            <text x="200" y="254" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">ORG</text>
            <line x1="120" y1="200" x2="200" y2="235" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" />
            <line x1="280" y1="200" x2="200" y2="235" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" />
          </svg>
          <div className="absolute top-3 left-3 flex gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-error" /> {t('landing.primarySuspect')}
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {t('landing.associate')}
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> {t('landing.organization')}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg shadow-sm border border-white dark:border-slate-700 max-w-xs">
            <p className="text-[10px] font-extrabold text-slate-900 dark:text-white mb-1">{t('landing.intelligenceInsight')}</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
              The "Gaurav S." syndicate shows high overlap with the 2024 Hawala channel. Recommended cross-reference with CID-Finance DB.
            </p>
          </div>
        </div>
        <div className="w-48 flex flex-col justify-center">
          <button className="w-full py-3 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-colors">
            {t('landing.fullNetworkView')}
          </button>
        </div>
      </div>
    </section>
  )
}
