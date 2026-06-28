import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { useLanguage } from '../contexts/LanguageContext'
import ChatWindow from '../components/chat/ChatWindow'
import WorkspaceRenderer from '../components/workspace/WorkspaceRenderer'
import ShareDropdown from '../components/common/ShareDropdown'

export default function WorkspacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { currentId, selectConversation, conversations } = useChat()

  useEffect(() => {
    if (id && id !== 'current' && id !== currentId) {
      const exists = conversations.find((c) => c.id === id)
      if (exists) {
        selectConversation(id)
      }
    }
  }, [id, currentId, conversations, selectConversation])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-1"
    >
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-outline-variant/30 dark:border-slate-700/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/30 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            <span>{t('page.back')}</span>
          </button>
          <div className="flex items-center gap-2">
            <ShareDropdown />
          </div>
        </div>
        <ChatWindow />
      </div>

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 380, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:block h-full border-l border-outline-variant/30 dark:border-slate-700/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm"
      >
        <WorkspaceRenderer />
      </motion.div>
    </motion.div>
  )
}
