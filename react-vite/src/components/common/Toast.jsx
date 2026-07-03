import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, X } from 'lucide-react'

let toastIdCounter = 0
let addToastFn = null

export function toast(message, type = 'success', duration = 2000) {
  if (addToastFn) {
    addToastFn({ id: ++toastIdCounter, message, type, duration })
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((t) => {
    setToasts((prev) => [...prev, t])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      setTimeout(() => removeToast(t.id), t.duration)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, removeToast])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold ${
              t.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}
            role="alert"
          >
            {t.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}
