import { Paperclip } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function AttachmentButton({ onClick, disabled = false, className = '' }) {
  const { t } = useLanguage()

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2.5 rounded-lg text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      aria-label={t('common.attachFile')}
      title={t('common.attachFile')}
    >
      <Paperclip size={20} />
    </button>
  )
}
