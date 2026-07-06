import { Lightbulb, TrendingUp, TrendingDown } from 'lucide-react'

const insightIcons = {
  highest_day: Calendar,
  crime_increase: TrendingUp,
  crime_decrease: TrendingDown,
}

function Calendar({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export default function IntelligenceInsights({ insights }) {
  if (!insights || insights.length === 0) return null

  return (
    <div className="glass-panel p-6 rounded-xl">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-primary" aria-hidden="true" />
        Intelligence Insights
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight) => {
          const Icon = insightIcons[insight.type] || Lightbulb
          return (
            <div
              key={insight.type}
              className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {insight.title}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {insight.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
