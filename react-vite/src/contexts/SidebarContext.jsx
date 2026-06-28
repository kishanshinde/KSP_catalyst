import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import useMediaQuery from '../hooks/useMediaQuery'

const SidebarContext = createContext(null)
const STORAGE_KEY = 'ksp_sidebar_collapsed'

function getStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v !== null) return JSON.parse(v)
  } catch {}
  return undefined
}

export function SidebarProvider({ children }) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1199px)')
  const [collapsed, setCollapsed] = useState(() => {
    if (isMobile) return true
    return getStored() ?? false
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
    } else {
      const stored = getStored()
      if (stored !== undefined) setCollapsed(stored)
    }
  }, [isMobile])

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        if (isMobile) {
          setMobileOpen((p) => !p)
        } else {
          setCollapsed((p) => {
            const next = !p
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
            return next
          })
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isMobile])

  const toggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((p) => !p)
    } else {
      setCollapsed((p) => {
        const next = !p
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }
  }, [isMobile])

  const expandAndFocus = useCallback(() => {
    if (isMobile) {
      setMobileOpen(true)
    } else {
      setCollapsed(false)
      try { localStorage.setItem(STORAGE_KEY, 'false') } catch {}
    }
  }, [isMobile])

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, toggle, expandAndFocus, setMobileOpen, isMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
