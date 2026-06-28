import { useNavigate } from 'react-router-dom'
import SidebarItem from './SidebarItem'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSidebar } from '../../contexts/SidebarContext'

const bottomItems = [
  { id: 'settings', icon: 'settings', route: '/settings', labelKey: 'sidebar.settings' },
  { id: 'support', icon: 'help', route: '/settings', labelKey: 'sidebar.support' },
]

export default function SidebarFooter() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { collapsed } = useSidebar()

  return (
    <div className="px-2 pt-3 mt-auto shrink-0 border-t border-outline-variant dark:border-slate-700/50 space-y-0.5">
      {/* Emergency Dispatch */}
      <button
        onClick={() => navigate('/analytics')}
        className={`w-full flex items-center h-11 rounded-xl transition-all duration-150 bg-error/5 dark:bg-error/10 text-error hover:bg-error/10 dark:hover:bg-error/20 border border-error/10 ${
          collapsed
            ? 'justify-center px-0 gap-0'
            : 'justify-start px-3 gap-3'
        }`}
        aria-label={collapsed ? t('sidebar.emergencyDispatch') : undefined}
        title={collapsed ? t('sidebar.emergencyDispatch') : undefined}
      >
        <span className="material-symbols-outlined text-lg shrink-0">campaign</span>
        {!collapsed && (
          <span className="text-sm font-bold truncate">{t('sidebar.emergencyDispatch')}</span>
        )}
      </button>

      {bottomItems.map((item) => (
        <SidebarItem
          key={item.id}
          icon={item.icon}
          labelKey={item.labelKey}
          collapsed={collapsed}
          onClick={() => navigate(item.route)}
        />
      ))}
    </div>
  )
}
