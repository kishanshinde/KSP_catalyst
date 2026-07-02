import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

export default function Dropdown({ trigger, items, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [flipUp, setFlipUp] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const animOrigin = flipUp ? { y: 4 } : { y: -4 }

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 260
    const menuHeight = menuRef.current?.offsetHeight || 200

    let top = rect.bottom + 8
    let left = align === 'right' ? rect.right - menuWidth : rect.left

    if (top + menuHeight > window.innerHeight - 16) {
      top = rect.top - menuHeight - 8
      setFlipUp(true)
    } else {
      setFlipUp(false)
    }

    if (left < 8) left = 8
    if (left + menuWidth > window.innerWidth - 8) {
      left = align === 'right' ? Math.max(8, rect.left) : Math.max(8, rect.right - menuWidth)
    }

    setPosition({ top, left })
  }, [align])

  useEffect(() => {
    if (open) {
      updatePosition()
      requestAnimationFrame(updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [open, updatePosition])

  const handleClickOutside = useCallback((e) => {
    if (
      menuRef.current && !menuRef.current.contains(e.target) &&
      triggerRef.current && !triggerRef.current.contains(e.target)
    ) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  const handleKeyDown = useCallback((e) => {
    if (!open) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + items.length) % items.length)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < items.length) {
          items[activeIndex].onClick?.()
          setOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }, [open, items, activeIndex])

  const menu = (
    <AnimatePresence>
      {open && items.length > 0 && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.96, ...animOrigin }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, ...animOrigin }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 99999,
          }}
          className="w-[260px] rounded-xl border backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-black/10 dark:border-white/10 shadow-2xl py-2"
          role="menu"
          onKeyDown={handleKeyDown}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={async () => { setOpen(false); await item.onClick?.() }}
              className={`w-full flex items-center gap-4 px-5 py-3 text-sm transition-all duration-150 text-left ${
                item.destructive
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                  : 'text-on-surface dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              } ${activeIndex === i ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              role="menuitem"
              tabIndex={-1}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {item.icon && (
                <span className="shrink-0 text-on-surface-variant dark:text-slate-400">
                  {item.icon}
                </span>
              )}
              {item.title || item.label ? (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold whitespace-normal">
                    {item.title || item.label}
                  </span>
                  {item.description && (
                    <span className="text-xs leading-5 opacity-80 whitespace-normal">
                      {item.description}
                    </span>
                  )}
                </div>
              ) : (
                item.label
              )}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <div ref={triggerRef} className={`inline-block ${className}`}>
        <div
          onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev) }}
          role="button"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen(prev => !prev)
            }
          }}
        >
          {trigger}
        </div>
      </div>
      {createPortal(menu, document.body)}
    </>
  )
}
