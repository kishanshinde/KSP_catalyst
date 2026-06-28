import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import { createT } from '../i18n'

const STORAGE_KEY = 'ksp_language'

function getInitialLanguage() {
  return localStorage.getItem(STORAGE_KEY) || 'en'
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }, [])

  const t = useMemo(() => createT(language), [language])

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
