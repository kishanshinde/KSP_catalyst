// TODO: Replace with comprehensive financial analysis with charts
// Expected data format: { totalUnexplained, assets: [{ type, value, count }], flaggedAccounts }
export default function FinancialAnalysis({ data }) {
  if (!data?.assets) {
    return <div className="text-on-surface-variant/60 text-sm">No financial data available</div>
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">
            Asset Analysis
          </span>
        </div>

        {data.totalUnexplained && (
          <div className="text-center py-4 mb-4 bg-error/5 rounded-lg border border-error/10">
            <p className="text-xs text-on-surface-variant/60 mb-1">Total Unexplained Assets</p>
            <p className="text-2xl font-bold text-error">₹{data.totalUnexplained}</p>
          </div>
        )}

        <div className="space-y-3">
          {data.assets.map((asset, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-200/20 last:border-0">
              <div>
                <p className="text-sm font-medium text-on-surface">{asset.type}</p>
                <p className="text-xs text-on-surface-variant/40">{asset.count} item(s)</p>
              </div>
              <span className="text-sm font-semibold text-on-surface">₹{asset.value}</span>
            </div>
          ))}
        </div>

        {data.flaggedAccounts && (
          <div className="mt-4 pt-3 border-t border-slate-200/20 flex items-center gap-2">
            <span className="text-xs font-medium text-on-surface-variant/60">Flagged Accounts:</span>
            <span className="text-sm font-bold text-error">{data.flaggedAccounts}</span>
          </div>
        )}
      </div>
    </div>
  )
}
