import { useLanguage } from '../../contexts/LanguageContext'

export default function SystemFooter() {
  const { t } = useLanguage()

  return (
    <footer className="flex items-center justify-between px-8 py-4 border-t border-outline-variant dark:border-slate-700/50 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t('landing.systemActive')}
        </span>
        <span>{t('landing.coordinates')}</span>
      </div>
      <div className="flex items-center gap-6">
        <span>{t('landing.encryption')}</span>
        <span>{t('landing.session')}</span>
      </div>
    </footer>
  )
}
