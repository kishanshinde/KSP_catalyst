import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import SupportModal from '../common/SupportModal'
import NotificationDropdown from './NotificationDropdown'

export default function Header() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const menuRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'KSP Officer'
    : t('header.userName')

  const displayRole = user?.app_role || user?.role || t('header.userRole')

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'KP'

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

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors relative"
            aria-label={t('header.notifications')}
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white dark:border-slate-900" />
          </button>
          {notifOpen && <NotificationDropdown />}
        </div>

        <div className="h-8 w-px bg-outline-variant dark:bg-slate-700 mx-1" />

        {/* Dynamic User Officer Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left focus:outline-none"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm text-on-surface dark:text-white font-bold leading-tight">{displayName}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{displayRole}</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 overflow-hidden bg-primary/10 flex items-center justify-center font-bold text-sm text-primary dark:text-blue-400">
              {initials}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'Officer Session'}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {displayRole}
                </div>
              </div>

              <div className="py-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Badge/User ID:</span>
                  <span className="font-mono font-medium">{user?.user_id || 'KSP-AUTH'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-500 font-bold uppercase">{user?.status || 'Active'}</span>
                </div>
              </div>

              <div className="py-2 space-y-0.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full py-2 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setSupportOpen(true)
                  }}
                  className="w-full py-2 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">help</span>
                  <span>{t('sidebar.support')}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className="w-full py-2 px-3 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </header>
  )
}
