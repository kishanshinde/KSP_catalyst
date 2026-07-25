import { Mic, Square, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '../../contexts/LanguageContext'

export default function VoiceButton({ onClick, isRecording = false, isTranscribing = false, disabled = false, title, className = '' }) {
  const { t } = useLanguage()
  const label = title || t('common.voiceInput')

  const icon = isTranscribing ? (
    <Loader2 size={20} className="animate-spin" />
  ) : isRecording ? (
    <Square size={20} />
  ) : (
    <Mic size={20} />
  )

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      animate={isRecording ? {
        scale: [1, 1.12, 1],
        backgroundColor: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.35)', 'rgba(239, 68, 68, 0.15)'],
      } : {}}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: 'easeInOut',
      }}
      className={`p-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        isRecording
          ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
          : isTranscribing
            ? 'text-amber-500 bg-amber-500/10'
            : 'text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-white'
      } ${className}`}
      aria-label={label}
      title={label}
    >
      {icon}
    </motion.button>
  )
}
