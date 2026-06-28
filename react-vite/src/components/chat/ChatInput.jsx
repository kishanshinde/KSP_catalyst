import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import VoiceButton from '../common/VoiceButton'
import AttachmentButton from '../common/AttachmentButton'

export default function ChatInput({ onSend, disabled = false, placeholder, large = false }) {
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const resolvedPlaceholder = placeholder || t('chat.inputPlaceholder')

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, large ? 200 : 120) + 'px'
  }, [large])

  useEffect(() => {
    adjustHeight()
  }, [text, adjustHeight])

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend?.(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <motion.div
      initial={large ? { opacity: 0, y: 20 } : false}
      animate={large ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`flex items-end gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm micro-border rounded-2xl ${
        large ? 'p-4' : 'p-3'
      } transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30`}
    >
      <AttachmentButton disabled={disabled} />

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={resolvedPlaceholder}
        rows={1}
        disabled={disabled}
        className="flex-1 bg-transparent resize-none text-sm text-on-surface dark:text-slate-200 placeholder:text-on-surface-variant/50 dark:placeholder:text-slate-500 focus:outline-none leading-relaxed max-h-[200px]"
        aria-label={t('chat.inputAriaLabel')}
      />

      <VoiceButton disabled={disabled} />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSubmit}
        disabled={!text.trim() || disabled}
        className={`p-2.5 rounded-xl transition-all duration-200 ${
          text.trim() && !disabled
            ? 'bg-primary text-on-primary shadow-sm'
            : 'bg-surface-container-highest dark:bg-slate-700 text-on-surface-variant/50 dark:text-slate-500 cursor-not-allowed'
        }`}
        aria-label={t('chat.sendAriaLabel')}
      >
        <Send size={18} />
      </motion.button>
    </motion.div>
  )
}
