import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

function TrendIcon({ trend }) {
  if (trend === 'up') return <ArrowUp className="w-4 h-4 text-error" aria-hidden="true" />
  if (trend === 'down') return <ArrowDown className="w-4 h-4 text-emerald-600" aria-hidden="true" />
  return <Minus className="w-4 h-4 text-slate-400" aria-hidden="true" />
}

export default function CrimeDistribution({ crimeTypes }) {
  if (!crimeTypes || crimeTypes.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-xl flex items-center justify-center h-48">
        <p className="text-sm text-slate-400 dark:text-slate-500">No crime type data available</p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-6 rounded-xl h-full">
      <h3 className="text-[20px] font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl">category</span>
        Crime Distribution
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="Crime type distribution">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 pr-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Crime Type
              </th>
              <th className="text-right py-3 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap w-[72px]">
                Count
              </th>
              <th className="text-right py-3 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap w-[88px]">
                Change %
              </th>
              <th className="text-center py-3 pl-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap w-[60px]">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {crimeTypes.map((ct, i) => (
              <tr
                key={ct.crime}
                className={`border-b border-slate-100 dark:border-slate-800 ${
                  i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                }`}
              >
                <td className="py-3 pr-4 font-semibold text-slate-800 dark:text-slate-200 max-w-0">
                  <span className="block truncate" title={ct.crime}>
                    {ct.crime}
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                  {ct.count}
                </td>
                <td className={`py-3 px-3 text-right font-semibold tabular-nums ${
                  ct.change > 0 ? 'text-error' : ct.change < 0 ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {ct.change > 0 ? '+' : ''}{ct.change}%
                </td>
                <td className="py-3 pl-3 text-center">
                  <TrendIcon trend={ct.trend} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
