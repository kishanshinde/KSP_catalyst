import { useLocation, useNavigate } from 'react-router-dom'
import SidebarItem from './SidebarItem'
import { useSidebar } from '../../contexts/SidebarContext'

const items = [
  { id: 'ai-assistant', icon: 'smart_toy', route: '/', labelKey: 'sidebar.aiAssistant' },
  { id: 'fir-explorer', icon: 'description', route: '/analytics', labelKey: 'sidebar.firExplorer' },
  { id: 'criminal-networks', icon: 'hub', route: '/analytics', labelKey: 'sidebar.criminalNetworks' },
  { id: 'crime-analytics', icon: 'monitoring', route: '/analytics', labelKey: 'sidebar.crimeAnalytics' },
  { id: 'hotspots', icon: 'location_on', route: '/analytics', labelKey: 'sidebar.hotspots' },
  { id: 'financial-intel', icon: 'account_balance', route: '/analytics', labelKey: 'sidebar.financialIntel' },
]

export default function SidebarNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { collapsed } = useSidebar()

  return (
    <nav className="px-2 mb-3 space-y-0.5 shrink-0">
      {items.map((item) => {
        const isActive = item.route === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.route)
        return (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            labelKey={item.labelKey}
            active={isActive}
            collapsed={collapsed}
            onClick={() => navigate(item.route)}
          />
        )
      })}
    </nav>
  )
}
