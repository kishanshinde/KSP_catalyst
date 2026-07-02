import { useState, useCallback } from 'react'
import { Share2, Link, FileText, Check, Loader2 } from 'lucide-react'
import Dropdown from './Dropdown'
import Modal from './Modal'
import Button from './Button'
import { useChat } from '../../context/ChatContext'
import { useLanguage } from '../../contexts/LanguageContext'

export default function ShareDropdown() {
  const { t } = useLanguage()
  const { currentId, exportConversationPDF } = useChat()
  const [copySuccess, setCopySuccess] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const handleCopyLink = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }).catch(() => {})
  }, [])

  const handleExportConfirm = useCallback(async () => {
    setExportLoading(true)
    setShowExportModal(false)
    try {
      await exportConversationPDF(currentId)
    } finally {
      setExportLoading(false)
    }
  }, [currentId, exportConversationPDF])

  if (!currentId) return null

  const items = [
    {
      title: t('share.copyLink'),
      description: t('share.copyLinkDescription'),
      icon: copySuccess ? <Check size={18} className="text-green-600 dark:text-green-400" /> : <Link size={18} />,
      onClick: handleCopyLink,
    },
    {
      title: exportLoading ? t('share.exportPdfLoading') : t('share.exportPdf'),
      description: t('share.exportPdfDescription'),
      icon: exportLoading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />,
      onClick: () => setShowExportModal(true),
    },
  ]

  return (
    <>
      <Dropdown
        trigger={
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white hover:bg-white/30 dark:hover:bg-slate-800/30 rounded-lg transition-colors"
            aria-label={t('share.shareOptions')}
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">{t('share.share')}</span>
          </button>
        }
        items={items}
        align="right"
      />
      <Modal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={t('share.exportPdf')}
      >
        <p className="text-sm text-on-surface-variant dark:text-slate-400 mb-6">
          {t('share.exportPdfConfirmMessage')}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleExportConfirm}>
            {t('share.exportPdfGenerate')}
          </Button>
        </div>
      </Modal>
    </>
  )
}
