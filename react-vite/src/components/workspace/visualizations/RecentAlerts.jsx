import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

export default function RecentAlerts({ data }) {
  const alerts = data || [
    { type: 'critical', message: 'Repeat offender Ramesh G. spotted in Bangalore North', time: '2m ago' },
    { type: 'warning', message: 'New cybercrime pattern detected in Whitefield', time: '15m ago' },
    { type: 'info', message: 'FIR #2025/183 updated with new evidence', time: '1h ago' },
  ]

  const icons = { critical: AlertTriangle, warning: AlertCircle, info: Info }
  const colors = { critical: 'text-error', warning: 'text-amber-600', info: 'text-primary' }
  const bgColors = { critical: 'bg-error/10', warning: 'bg-amber-100/30', info: 'bg-primary/10' }

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const Icon = icons[a.type] || icons.info
        return (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${bgColors[a.type] || bgColors.info}`}>
            <Icon size={16} className={`${colors[a.type] || colors.info} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-on-surface dark:text-slate-200">{a.message}</p>
              <span className="text-xs text-on-surface-variant/40 dark:text-slate-500">{a.time}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
