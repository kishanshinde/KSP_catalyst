import { Share2, Link, FileText } from 'lucide-react'
import Dropdown from './Dropdown'
import { api } from '../../services/api'
import { useChat } from '../../context/ChatContext'

export default function ShareDropdown() {
  const { conversations, currentId } = useChat()
  const currentConversation = conversations.find((c) => c.id === currentId)
  const backendId = currentConversation?.backendId

  const items = [
    {
      label: 'Copy Share Link',
      icon: <Link size={16} />,
      onClick: () => {
        const url = window.location.href
        navigator.clipboard.writeText(url).catch(() => {})
      },
    },
    {
      label: 'Export PDF',
      icon: <FileText size={16} />,
      onClick: async () => {
        if (!backendId) return
        try {
          const { blob } = await api.generatePDF(backendId)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `conversation_${backendId}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } catch (err) {
          console.error('PDF export failed:', err)
        }
      },
    },
  ]

  if (!currentId || !backendId) return null

  return (
    <Dropdown
      trigger={
        <button
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-white/30 rounded-lg transition-colors"
          aria-label="Share options"
        >
          <Share2 size={18} />
          <span className="hidden sm:inline">Share</span>
        </button>
      }
      items={items}
      align="right"
    />
  )
}
