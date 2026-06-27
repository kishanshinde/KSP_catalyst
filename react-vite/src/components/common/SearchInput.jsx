import { Search } from 'lucide-react'

export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 bg-white/40 backdrop-blur-sm micro-border rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        aria-label={placeholder}
      />
    </div>
  )
}
