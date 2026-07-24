import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { User, Bot, AlertTriangle, Ban, Volume2, VolumeX } from 'lucide-react'
import { formatTime } from '../../utils/formatters'
import { useLanguage } from '../../contexts/LanguageContext'
import { MESSAGE_STATUS } from '../../utils/constants'
import MarkdownRenderer from './MarkdownRenderer'

const localeMap = { en: 'en-IN', kn: 'kn-IN' }

function StatusBadge({ status }) {
  const { t } = useLanguage()

  if (status === MESSAGE_STATUS.CANCELLED) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-on-surface-variant/60 dark:text-slate-500">
        <Ban size={12} />
        <span>{t('chat.generationCancelled')}</span>
      </div>
    )
  }

  if (status === MESSAGE_STATUS.FAILED) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-error/70">
        <AlertTriangle size={12} />
        <span>{t('chat.generationFailed')}</span>
      </div>
    )
  }

  if (status === MESSAGE_STATUS.PROCESSING) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-xs text-on-surface-variant/60 dark:text-slate-500">
        <span className="w-1.5 h-1.5 bg-on-surface-variant/40 dark:bg-slate-500 rounded-full animate-pulse" />
        <span>{t('chat.processingMessage')}</span>
      </div>
    )
  }

  return null
}

const ChatMessage = memo(function ChatMessage({ message }) {
  const { language, t } = useLanguage()
  const isUser = message.role === 'user'
  const isCancelled = message.status === MESSAGE_STATUS.CANCELLED

  const [isPlaying, setIsPlaying] = useState(false)
  const utteranceRef = useRef(null)

  const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  const handleSpeak = useCallback(() => {
    if (!isSpeechSupported) return

    if (isPlaying) {
      speechSynthesis.cancel()
      utteranceRef.current = null
      setIsPlaying(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(message.content)
    utterance.lang = localeMap[language] || 'en-IN'

    if (language === 'kn') {
      const voices = speechSynthesis.getVoices()
      const knVoice = voices.find(v => v.lang.startsWith('kn'))
      if (knVoice) utterance.voice = knVoice
    }

    utterance.onend = () => {
      setIsPlaying(false)
      utteranceRef.current = null
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      utteranceRef.current = null
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }, [isPlaying, message.content, language, isSpeechSupported])

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
              : isCancelled
                ? 'bg-white dark:bg-slate-800 border border-dashed border-on-surface-variant/30 dark:border-slate-600 text-on-surface dark:text-slate-200 rounded-tl-md shadow-sm opacity-70'
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
          {!isUser && <StatusBadge status={message.status} />}
          {!isUser && !isCancelled && isSpeechSupported && (
            <button
              onClick={handleSpeak}
              className="p-1 rounded text-on-surface-variant/50 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer"
              title={isPlaying ? t('common.stopSpeaking') : t('common.speakResponse')}
              aria-label={isPlaying ? t('common.stopSpeaking') : t('common.speakResponse')}
            >
              {isPlaying ? (
                <VolumeX size={12} className="text-red-500" />
              ) : (
                <Volume2 size={12} />
              )}
            </button>
          )}
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
