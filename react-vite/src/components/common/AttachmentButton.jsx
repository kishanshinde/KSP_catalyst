import { useRef } from 'react'
import { Paperclip } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function AttachmentButton({ onFilesSelected, disabled = false, className = '' }) {
  const { t } = useLanguage()
  const inputRef = useRef(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            onFilesSelected?.(e.target.files)
            e.target.value = ''
          }
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={`p-2.5 rounded-lg text-on-surface-variant dark:text-slate-400 hover:bg-surface-container dark:hover:bg-slate-800 hover:text-on-surface dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        aria-label={t('common.attachFile')}
        title={t('common.attachFile')}
      >
        <Paperclip size={20} />
      </button>
    </>
  )
}
