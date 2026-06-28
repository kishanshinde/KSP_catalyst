// TODO: Replace with full offender profile component with case history
// Expected data format: { name, age, gender, city, firCount, riskLevel, crimeTypes, repeatOffender, lastArrest }
export default function OffenderProfile({ data }) {
  if (!data?.name) {
    return <div className="text-on-surface-variant/60 text-sm">No profile data available</div>
  }

  const riskColors = {
    high: 'bg-error/10 text-error border-error/20',
    medium: 'bg-amber-100/30 text-amber-700 border-amber-200/30',
    low: 'bg-emerald-100/30 text-emerald-700 border-emerald-200/30',
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">{data.name}</h3>
            <p className="text-sm text-on-surface-variant/60">
              {data.age} years · {data.gender} · {data.city}
            </p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${riskColors[data.riskLevel] || riskColors.low}`}>
            {data.riskLevel?.toUpperCase()} RISK
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-error">{data.firCount}</p>
            <p className="text-xs text-on-surface-variant/60">FIRs</p>
          </div>
          <div className="bg-white/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface">{data.crimeTypes?.length || 0}</p>
            <p className="text-xs text-on-surface-variant/60">Crime Types</p>
          </div>
          <div className="bg-white/40 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-on-surface">{data.repeatOffender ? 'Yes' : 'No'}</p>
            <p className="text-xs text-on-surface-variant/60">Repeat Offender</p>
          </div>
        </div>

        {data.crimeTypes && (
          <div>
            <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider block mb-2">
              Crime Categories
            </span>
            <div className="flex flex-wrap gap-2">
              {data.crimeTypes.map((c) => (
                <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.lastArrest && (
          <p className="text-xs text-on-surface-variant/40 mt-3 pt-3 border-t border-slate-200/20">
            Last arrest: {data.lastArrest}
          </p>
        )}
      </div>
    </div>
  )
}
