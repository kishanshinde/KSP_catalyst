import Modal from './Modal'

export default function SupportModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Support">
      <div className="space-y-3 text-sm text-on-surface dark:text-slate-200">
        <p>Need help with Lumina Intelligence?</p>
        <p className="text-on-surface-variant dark:text-slate-400">
          Contact your system administrator or IT support desk for account access issues, technical problems, or feature requests.
        </p>
      </div>
    </Modal>
  )
}
