import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSidebar } from '../../contexts/SidebarContext'

export default function SidebarLogo() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { collapsed } = useSidebar()

  if (collapsed) {
    return (
      <button
        onClick={() => navigate('/')}
        className="w-full h-11 flex items-center justify-center rounded-xl transition-colors duration-150 hover:bg-surface-container dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
        aria-label={t('sidebar.kspLogoAlt')}
        title={t('sidebar.kspLogoAlt')}
      >
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 overflow-hidden">
          <img
            alt={t('sidebar.kspLogoAlt')}
            className="w-7 h-7 object-contain"
            src="/ksp-logo.png"
          />
        </div>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 overflow-hidden min-w-0">
      <div className="w-9 h-9 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 overflow-hidden">
        <img
          alt={t('sidebar.kspLogoAlt')}
          className="w-7 h-7 object-contain"
          src="/ksp-logo.png"
        />
      </div>
      <div className="overflow-hidden whitespace-nowrap">
        <h2 className="font-bold text-on-surface dark:text-white text-sm leading-tight truncate">
          {t('sidebar.commandCenter')}
        </h2>
        <p className="text-[10px] text-on-surface-variant dark:text-slate-400 uppercase tracking-widest font-semibold truncate">
          {t('sidebar.stateIntelligenceUnit')}
        </p>
      </div>
    </div>
  )
}
