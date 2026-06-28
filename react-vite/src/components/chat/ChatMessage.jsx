import { memo } from 'react'
import { motion } from 'framer-motion'
import { User, Bot } from 'lucide-react'
import { formatTime } from '../../utils/formatters'
import { useLanguage } from '../../contexts/LanguageContext'
import MarkdownRenderer from './MarkdownRenderer'

const localeMap = { en: 'en-IN', kn: 'kn-IN' }

const ChatMessage = memo(function ChatMessage({ message }) {
  const { language } = useLanguage()
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
          <Bot size={16} className="text-on-primary" />
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div
          className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-on-primary rounded-tr-md'
              : 'bg-white dark:bg-slate-800 border border-outline-variant/50 dark:border-slate-700 text-on-surface dark:text-slate-200 rounded-tl-md shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-on-surface-variant/40 dark:text-slate-500">
            {formatTime(message.timestamp, localeMap[language] || 'en-IN')}
          </span>
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-on-surface dark:bg-slate-300 flex items-center justify-center shrink-0 mt-1">
          <User size={16} className="text-surface dark:text-slate-800" />
        </div>
      )}
    </motion.div>
  )
})

export default ChatMessage
