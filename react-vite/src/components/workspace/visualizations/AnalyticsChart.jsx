// TODO: Replace with Recharts interactive chart component
// Expected data format: dynamic — renders summary stats or key-value data
export default function AnalyticsChart({ data }) {
  if (!data) {
    return <div className="text-on-surface-variant/60 text-sm">No chart data available</div>
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">
            Data Overview
          </span>
        </div>

        {data.total && (
          <div className="text-center py-4 mb-4 bg-surface-container/50 rounded-lg">
            <p className="text-3xl font-bold text-primary">{data.total}</p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Total Records</p>
          </div>
        )}

        {data.byType && (
          <div>
            <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider block mb-2">By Type</span>
            <div className="space-y-2">
              {Object.entries(data.byType).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-28 shrink-0">{key}</span>
                  <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/50"
                      style={{ width: `${(val / Math.max(...Object.values(data.byType))) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-on-surface-variant/60 w-10 text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.byDivision && (
          <div className="mt-4 pt-4 border-t border-slate-200/20">
            <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider block mb-2">By Division</span>
            <div className="space-y-2">
              {Object.entries(data.byDivision).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-32 shrink-0">{key}</span>
                  <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400/50"
                      style={{ width: `${(val / Math.max(...Object.values(data.byDivision))) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-on-surface-variant/60 w-10 text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
