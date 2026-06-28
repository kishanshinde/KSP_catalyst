import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '../../context/ChatContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useSidebar } from '../../contexts/SidebarContext'
import SidebarToggle from './SidebarToggle'
import SidebarHeader from './SidebarHeader'
import SidebarNavigation from './SidebarNavigation'
import SidebarFooter from './SidebarFooter'

export default function Sidebar() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { collapsed, mobileOpen, expandAndFocus, setMobileOpen, isMobile } = useSidebar()
  const { conversations, currentId, selectConversation, deleteConversation, loadingHistory, newConversation } = useChat()
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef(null)

  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleNewChat = useCallback(() => {
    newConversation()
    navigate('/')
  }, [newConversation, navigate])

  const handleSearchIconClick = useCallback(() => {
    expandAndFocus()
    requestAnimationFrame(() => {
      setTimeout(() => searchInputRef.current?.focus(), 280)
    })
  }, [expandAndFocus])

  const sidebarWidth = collapsed ? 'w-sidebar-collapsed' : 'w-sidebar-width'

  const baseClasses = 'flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-outline-variant dark:border-slate-700/50 shadow-sm'

  const asideClasses = isMobile
    ? `${baseClasses} fixed left-0 top-0 z-40 h-full w-sidebar-width transition-transform duration-[250ms] ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `${baseClasses} ${sidebarWidth} h-screen relative transition-all duration-[250ms] ease-in-out`

  const aside = (
    <aside
      className={asideClasses}
      role="navigation"
      aria-label="Main navigation"
    >
      {!isMobile && (
        <div className="flex items-center justify-end h-14 px-3 shrink-0">
          <SidebarToggle />
        </div>
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        <SidebarHeader />

        {/* New Chat */}
        <div className="px-3 mb-3 shrink-0">
          <button
            onClick={handleNewChat}
            className={`w-full h-11 rounded-xl flex items-center text-sm font-bold hover:bg-primary/90 transition-colors bg-primary text-white ${
              collapsed
                ? 'justify-center px-0 gap-0'
                : 'justify-start px-3 gap-3'
            }`}
            aria-label={collapsed ? t('sidebar.newChat') : undefined}
            title={collapsed ? t('sidebar.newChat') : undefined}
          >
            <span className="material-symbols-outlined text-lg shrink-0">add</span>
            {!collapsed && <span className="text-sm font-bold truncate">{t('sidebar.newChat')}</span>}
          </button>
        </div>

        {/* Search */}
        <div className="px-3 mb-3 shrink-0">
          {collapsed ? (
            <button
              onClick={handleSearchIconClick}
              className="w-full h-11 flex items-center justify-center rounded-xl text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800 transition-colors"
              aria-label={t('sidebar.searchPlaceholder')}
              title={t('sidebar.searchPlaceholder')}
            >
              <span className="material-symbols-outlined text-xl shrink-0">search</span>
            </button>
          ) : (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-slate-400 text-lg pointer-events-none">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('sidebar.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-3 bg-surface-container-high dark:bg-slate-800 text-sm rounded-xl border border-outline-variant dark:border-slate-700 outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant dark:placeholder:text-slate-400 text-on-surface dark:text-slate-200"
              />
            </div>
          )}
        </div>

        <SidebarNavigation />

        {/* Conversation History */}
        <div className="flex-1 px-2 overflow-y-auto custom-scrollbar min-h-0">
          {!collapsed && (
            <div className="px-1 mb-2">
              <span className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
                {t('sidebar.conversationHistory')}
              </span>
            </div>
          )}
          {loadingHistory ? (
            <div className="space-y-2 px-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-surface-container-high dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            !collapsed && (
              <p className="text-xs text-on-surface-variant dark:text-slate-400 text-center mt-4 px-2">
                {searchTerm ? t('sidebar.noMatchingConversations') : t('sidebar.noConversationsYet')}
              </p>
            )
          ) : (
            <div className="space-y-0.5 px-1">
              {filteredConvs.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center h-10 rounded-xl cursor-pointer transition-colors ${
                    collapsed
                      ? 'justify-center px-0 gap-0'
                      : 'justify-start px-3 gap-2'
                  } ${
                    conv.id === currentId
                      ? 'bg-primary-container dark:bg-primary/20 text-primary'
                      : 'hover:bg-surface-container-high dark:hover:bg-slate-800 text-on-surface dark:text-slate-200'
                  }`}
                  onClick={() => selectConversation(conv.id)}
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant dark:text-slate-400 shrink-0">chat</span>
                  {!collapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        {conv.snippet && (
                          <p className="text-xs text-on-surface-variant dark:text-slate-400 truncate">{conv.snippet}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant dark:text-slate-400 hover:text-error shrink-0"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <SidebarFooter />
      </div>
    </aside>
  )

  if (isMobile) {
    return (
      <>
        <div className="fixed top-4 right-3 z-50">
          <SidebarToggle />
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>
        {aside}
      </>
    )
  }

  return <>{aside}</>
}
