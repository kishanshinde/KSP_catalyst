import { useSidebar } from '../../contexts/SidebarContext'
import { useLanguage } from '../../contexts/LanguageContext'

export default function SidebarToggle() {
  const { collapsed, toggle } = useSidebar()
  const { t } = useLanguage()

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-lg text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
      aria-label={collapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
      aria-expanded={!collapsed}
    >
      <span className="material-symbols-outlined text-xl">
        {collapsed ? 'menu' : 'menu_open'}
      </span>
    </button>
  )
}
