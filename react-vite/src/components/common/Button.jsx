import { forwardRef } from 'react'

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90 active:scale-[0.98]',
  secondary: 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md micro-border hover:bg-white/60 dark:hover:bg-slate-700/60 text-on-surface dark:text-slate-200',
  ghost: 'bg-transparent hover:bg-white/30 dark:hover:bg-slate-800/50 micro-border text-on-surface dark:text-slate-200',
  danger: 'bg-error text-on-error hover:bg-error/90',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  icon: 'p-2',
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', children, icon: Icon, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon size={16} className="shrink-0" aria-hidden="true" />}
      {children}
    </button>
  )
})

export default Button
