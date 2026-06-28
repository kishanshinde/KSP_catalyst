import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function Header() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex justify-between items-center w-full px-10 h-20 sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-outline-variant dark:border-slate-700/50">
      <div className="flex items-center gap-4">
        <img
          alt={t('header.kspLogoAlt')}
          className="h-10 w-auto"
          src="/ksp-logo.png"
        />
        <h1 className="text-xl font-bold text-on-surface dark:text-white tracking-tight">
          {t('header.brand')} <span className="text-primary">{t('header.brandHighlight')}</span>
        </h1>
        <div className="hidden xl:flex items-center bg-slate-100/50 dark:bg-slate-800/50 px-5 py-2.5 rounded-full border border-outline-variant dark:border-slate-700 w-96 ml-6">
          <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 mr-2 text-xl">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none text-on-surface dark:text-slate-200"
            placeholder={t('header.searchPlaceholder')}
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-outline-variant dark:border-slate-700">
          <button
            onClick={() => setLanguage('en')}
            className={`px-4 py-1.5 text-xs font-bold transition-colors rounded-lg ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-on-surface dark:text-white shadow-sm'
                : 'font-medium text-slate-500 dark:text-slate-400 hover:text-on-surface dark:hover:text-white'
            }`}
            aria-label={t('header.languageToggle')}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('kn')}
            className={`px-4 py-1.5 text-xs font-bold transition-colors rounded-lg ${
              language === 'kn'
                ? 'bg-white dark:bg-slate-700 text-on-surface dark:text-white shadow-sm'
                : 'font-medium text-slate-500 dark:text-slate-400 hover:text-on-surface dark:hover:text-white'
            }`}
            aria-label={t('header.languageToggle')}
          >
            ಕನ್ನಡ
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors relative group"
            title={t('header.themeToggle')}
            onClick={toggleTheme}
            aria-label={t('header.themeToggle')}
          >
            <span className="material-symbols-outlined">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
            <span className="absolute inset-0 bg-primary/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors relative" aria-label={t('header.notifications')}>
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white dark:border-slate-900" />
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant dark:bg-slate-700 mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-on-surface dark:text-white font-bold leading-tight">{t('header.userName')}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{t('header.userRole')}</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden bg-slate-100 dark:bg-slate-700" aria-label={t('header.avatarAlt')}>
            <div className="w-full h-full object-cover bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-400 dark:text-slate-300 font-bold text-sm">
              RB
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
