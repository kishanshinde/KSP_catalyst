import { useLanguage } from '../../contexts/LanguageContext'

export default function SidebarItem({ icon, labelKey, active, collapsed, onClick }) {
  const { t } = useLanguage()
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 ${
        collapsed
          ? 'justify-center px-0 gap-0'
          : 'justify-start px-3 gap-3'
      } ${
        active
          ? 'bg-primary/10 dark:bg-primary/20 text-primary'
          : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-white'
      }`}
      aria-label={collapsed ? t(labelKey) : undefined}
      title={collapsed ? t(labelKey) : undefined}
    >
      <span className="material-symbols-outlined text-xl shrink-0">{icon}</span>
      {!collapsed && (
        <span className="text-sm font-medium truncate">{t(labelKey)}</span>
      )}
    </button>
  )
}
