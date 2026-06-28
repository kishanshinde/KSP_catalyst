import { Search } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function SearchInput({ value, onChange, placeholder, className = '' }) {
  const { t } = useLanguage()
  const resolvedPlaceholder = placeholder || t('common.search')

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-slate-500" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={resolvedPlaceholder}
        className="w-full pl-9 pr-3 py-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm micro-border rounded-lg text-sm text-on-surface dark:text-slate-200 placeholder:text-on-surface-variant/60 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        aria-label={resolvedPlaceholder}
      />
    </div>
  )
}
