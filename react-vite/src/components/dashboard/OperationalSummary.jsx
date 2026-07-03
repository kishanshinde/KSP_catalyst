import { BarChart3, Calendar, TrendingDown, Activity } from 'lucide-react'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

function formatPeakDay(dateStr) {
  if (!dateStr) return 'N/A'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const d = parseInt(parts[2], 10)
    return `${d} ${MONTHS_SHORT[parseInt(parts[1], 10) - 1]} ${parts[0]}`
  }
  if (parts.length === 2) {
    return `${MONTHS_LONG[parseInt(parts[1], 10) - 1]} ${parts[0]}`
  }
  return dateStr
}

function StatCard({ icon: Icon, label, value, trend }) {
  const trendColor =
    trend === 'positive' ? 'text-error' :
    trend === 'negative' ? 'text-emerald-600' :
    'text-slate-400 dark:text-slate-500'

  return (
    <div className="glass-panel p-6 rounded-xl flex items-start gap-4 min-h-[108px]">
      <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/5 shrink-0">
        <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <p className={`text-[34px] font-extrabold text-slate-900 dark:text-white mt-1 leading-tight ${trendColor}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default function OperationalSummary({ summary, trendPercentage }) {
  if (!summary) return null

  const trendValue = trendPercentage != null
    ? `${trendPercentage > 0 ? '+' : ''}${trendPercentage}%`
    : 'N/A'

  const trend =
    trendPercentage > 0 ? 'positive' :
    trendPercentage < 0 ? 'negative' :
    'neutral'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={BarChart3}
        label="Total Crimes"
        value={summary.totalCrimes}
      />
      <StatCard
        icon={Activity}
        label="Avg / Day"
        value={summary.averagePerDay}
      />
      <StatCard
        icon={Calendar}
        label="Peak Day"
        value={formatPeakDay(summary.highestDay)}
      />
      <StatCard
        icon={TrendingDown}
        label="Trend"
        value={trendValue}
        trend={trend}
      />
    </div>
  )
}
