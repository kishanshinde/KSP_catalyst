import Modal from './Modal'
import { useLanguage } from '../../contexts/LanguageContext'

export default function SupportModal({ open, onClose }) {
  const { t } = useLanguage()

  return (
    <Modal open={open} onClose={onClose} title="Support">
      <div className="space-y-3 text-sm text-on-surface dark:text-slate-200">
        <p>Need help with Lumina Intelligence?</p>
        <p className="text-on-surface-variant dark:text-slate-400">
          Contact your system administrator or IT support desk for account access issues, technical problems, or feature requests.
        </p>
      </div>
      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-on-surface dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {t('common.close')}
        </button>
      </div>
    </Modal>
  )
}
