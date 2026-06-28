import { motion } from 'framer-motion'
import { Bot, Search } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function TypingIndicator({ phase }) {
  const { t } = useLanguage()
  const isIntentPhase = phase === 'intent' || !phase

  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
        {isIntentPhase ? <Bot size={16} className="text-on-primary" /> : <Search size={16} className="text-on-primary" />}
      </div>
      <div className="bg-white dark:bg-slate-800 border border-outline-variant/50 dark:border-slate-700 text-on-surface dark:text-slate-200 rounded-xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant/70 dark:text-slate-400">
            {isIntentPhase ? t('chat.understandingQuery') : t('chat.searchingDatabase')}
          </span>
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 bg-on-surface-variant/40 dark:bg-slate-500 rounded-full"
                animate={{ y: [0, -3, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
