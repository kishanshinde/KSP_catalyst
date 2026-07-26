import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useTheme } from '../../contexts/ThemeContext'

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0].payload
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-slate-900 dark:text-white mb-1">{entry.label}</p>
      <p className="text-slate-600 dark:text-slate-300">
        FIRs: <span className="font-bold text-primary">{entry.count}</span>
      </p>
    </div>
  )
}

export default function CrimeTrendChart({ chart, isMonthView, barColor = '#004ac6' }) {
  const { isDark } = useTheme()

  const data = useMemo(() => chart || [], [chart])

  const gridStroke = isDark ? '#334155' : '#e2e8f0'
  const tickFill = isDark ? '#94a3b8' : '#64748b'

  if (!data.length) {
    return (
      <div className="glass-panel p-8 rounded-xl flex items-center justify-center h-[420px]">
        <p className="text-sm text-slate-400 dark:text-slate-500">No trend data available</p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-6 rounded-xl h-full">
      <h3 className="text-[20px] font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl">trending_up</span>
        {isMonthView ? 'Monthly Crime Trend' : 'Daily Crime Trend'}
      </h3>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={isMonthView ? -30 : 0}
              textAnchor={isMonthView ? 'end' : 'middle'}
              height={isMonthView ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 12, fill: tickFill }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 74, 198, 0.05)' }} />
            <Bar
              dataKey="count"
              fill={barColor}
              radius={[4, 4, 0, 0]}
              animationBegin={0}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
