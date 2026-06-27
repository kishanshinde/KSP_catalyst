import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useChat } from '../../context/ChatContext'

const navItems = [
  { id: 'ai-assistant', label: 'AI Assistant', icon: 'smart_toy', fill: true, route: '/' },
  { id: 'fir-explorer', label: 'FIR Explorer', icon: 'description', route: '/analytics' },
  { id: 'criminal-networks', label: 'Criminal Networks', icon: 'hub', route: '/analytics' },
  { id: 'crime-analytics', label: 'Crime Analytics', icon: 'monitoring', route: '/analytics' },
  { id: 'hotspots', label: 'Hotspots', icon: 'location_on', route: '/analytics' },
  { id: 'financial-intel', label: 'Financial Intel', icon: 'account_balance', route: '/analytics' },
]

const bottomItems = [
  { id: 'emergency', label: 'Emergency Dispatch', icon: 'campaign', danger: true },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings' },
  { id: 'support', label: 'Support', icon: 'help', route: '/settings' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    conversations,
    currentId,
    selectConversation,
    deleteConversation,
    loadingHistory,
    newConversation,
  } = useChat()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col py-6 z-40 bg-white/80 backdrop-blur-xl border-r border-outline-variant shadow-sm w-sidebar-width">
      {/* Branding */}
      <div className="px-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 overflow-hidden">
            <img
              alt="KSP Logo"
              className="w-8 h-8 object-contain"
              src="/ksp-logo.png"
            />
          </div>
          <div>
            <h2 className="font-bold text-on-surface text-sm leading-tight">Command Center</h2>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">State Intelligence Unit</p>
          </div>
        </div>
      </div>

      {/* New Chat button + Search */}
      <div className="px-4 mb-3 space-y-2">
        <button
          onClick={() => {
            newConversation()
            navigate('/')
          }}
          className="w-full py-2.5 px-4 bg-primary text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Chat
        </button>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-surface-container-high text-sm rounded-xl border border-outline-variant outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant"
          />
        </div>
      </div>

      {/* Nav links */}
      <nav className="px-4 mb-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.route === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.route)
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className={isActive ? 'nav-link-active w-full text-left' : 'nav-link w-full text-left'}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: `'FILL' ${isActive || item.fill ? 1 : 0}` }}
              >
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Conversation history */}
      <div className="flex-1 px-4 overflow-y-auto custom-scrollbar">
        {loadingHistory ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-container-high rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredConvs.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center mt-8">
            {searchTerm ? 'No matching conversations' : 'No conversations yet'}
          </p>
        ) : (
          <div className="space-y-1">
            {filteredConvs.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  conv.id === currentId
                    ? 'bg-primary-container text-primary'
                    : 'hover:bg-surface-container-high text-on-surface'
                }`}
                onClick={() => selectConversation(conv.id)}
              >
                <span className="material-symbols-outlined text-lg text-on-surface-variant">chat</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  {conv.snippet && (
                    <p className="text-xs text-on-surface-variant truncate">{conv.snippet}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom items */}
      <div className="px-4 pt-4 mt-auto border-t border-outline-variant space-y-1.5">
        {bottomItems.map((item) => {
          if (item.danger) {
            return (
              <button
                key={item.id}
                onClick={() => navigate('/analytics')}
                className="w-full py-3 px-4 bg-error-container text-error rounded-xl flex items-center justify-center gap-2 text-sm font-bold border border-error/10 hover:bg-red-100 transition-colors"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </button>
            )
          }
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className="nav-link w-full text-left"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
