import { Paperclip } from 'lucide-react'

export default function AttachmentButton({ onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      aria-label="Attach file"
      title="Attach file"
    >
      <Paperclip size={20} />
    </button>
  )
}
