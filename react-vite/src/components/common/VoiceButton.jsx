import { Mic } from 'lucide-react'

export default function VoiceButton({ onClick, disabled = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      aria-label="Voice input"
      title="Voice input"
    >
      <Mic size={20} />
    </button>
  )
}
