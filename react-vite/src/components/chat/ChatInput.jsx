import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Square, X, FileText, FileSpreadsheet, FileImage } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useChat } from '../../context/ChatContext'
import VoiceButton from '../common/VoiceButton'
import AttachmentButton from '../common/AttachmentButton'

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function FileIcon({ type }) {
  if (!type) return <FileText size={14} />
  if (type.includes('spreadsheet') || type.includes('csv') || type.includes('xlsx')) return <FileSpreadsheet size={14} />
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) return <FileImage size={14} />
  return <FileText size={14} />
}

export default function ChatInput({ onSend, loading = false, onCancel, placeholder, large = false }) {
  const { t } = useLanguage()
  const { attachments, addAttachments, removeAttachment } = useChat()
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
    if (!trimmed || loading) return
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
    <div className="flex flex-col gap-1">
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 px-1 overflow-x-auto"
          >
            {attachments.map((att) => (
              <motion.div
                key={att.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 shrink-0 bg-surface-container-high dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs border border-outline-variant/40 dark:border-slate-700"
              >
                <FileIcon type={att.type} />
                <span className="max-w-[120px] truncate text-on-surface dark:text-slate-200">{att.name}</span>
                <span className="text-on-surface-variant/60 dark:text-slate-500 shrink-0">{formatSize(att.size)}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-0.5 rounded text-on-surface-variant/50 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-slate-700 transition-colors"
                  aria-label={t('chat.fileRemove')}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={large ? { opacity: 0, y: 20 } : false}
        animate={large ? { opacity: 1, y: 0 } : false}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={`flex items-end gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm micro-border rounded-2xl ${
          large ? 'p-4' : 'p-3'
        } transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30`}
      >
        <AttachmentButton onFilesSelected={addAttachments} disabled={loading} />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          rows={1}
          disabled={loading}
          className="flex-1 bg-transparent resize-none text-sm text-on-surface dark:text-slate-200 placeholder:text-on-surface-variant/50 dark:placeholder:text-slate-500 focus:outline-none leading-relaxed max-h-[200px]"
          aria-label={t('chat.inputAriaLabel')}
        />

        <VoiceButton disabled={loading} />

        {loading ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            className="p-2.5 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all duration-200"
            aria-label={t('chat.stopGenerating')}
            title={t('chat.stopGenerating')}
          >
            <Square size={18} />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              text.trim()
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-highest dark:bg-slate-700 text-on-surface-variant/50 dark:text-slate-500 cursor-not-allowed'
            }`}
            aria-label={t('chat.sendAriaLabel')}
          >
            <Send size={18} />
          </motion.button>
        )}
      </motion.div>
    </div>
  )
}
