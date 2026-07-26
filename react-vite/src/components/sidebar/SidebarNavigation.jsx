import { useLocation, useNavigate } from 'react-router-dom'
import SidebarItem from './SidebarItem'
import { useSidebar } from '../../contexts/SidebarContext'

const items = [
  { id: 'ai-assistant', icon: 'smart_toy', hash: '', labelKey: 'sidebar.aiAssistant' },
  { id: 'fir-explorer', icon: 'description', hash: 'fir-explorer', labelKey: 'sidebar.firExplorer' },
  { id: 'criminal-networks', icon: 'hub', hash: 'criminal-networks', labelKey: 'sidebar.criminalNetworks' },
  { id: 'crime-analytics', icon: 'monitoring', hash: 'crime-analytics', labelKey: 'sidebar.crimeAnalytics' },
  { id: 'hotspots', icon: 'location_on', hash: 'hotspots', labelKey: 'sidebar.hotspots' },
]

export default function SidebarNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { collapsed } = useSidebar()

  return (
    <nav className="px-2 mb-3 space-y-0.5 shrink-0">
      {items.map((item) => {
        const isActive =
          location.pathname === '/' && location.hash === (item.hash ? `#${item.hash}` : '')
        return (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            labelKey={item.labelKey}
            active={isActive}
            collapsed={collapsed}
            onClick={() => navigate(item.hash ? `/#${item.hash}` : '/')}
          />
        )
      })}
    </nav>
  )
}
