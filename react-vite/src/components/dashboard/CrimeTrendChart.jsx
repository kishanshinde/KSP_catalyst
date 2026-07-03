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

export default function CrimeTrendChart({ chart, isMonthView }) {
  const peakCount = useMemo(() => {
    if (!chart || chart.length === 0) return 0
    return Math.max(...chart.map(e => e.count))
  }, [chart])

  const data = useMemo(() => chart || [], [chart])

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
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={isMonthView ? -30 : 0}
              textAnchor={isMonthView ? 'end' : 'middle'}
              height={isMonthView ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 74, 198, 0.05)' }} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              animationBegin={0}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <rect key={index} fill={entry.count === peakCount && entry.count > 0 ? '#dc2626' : '#004ac6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
