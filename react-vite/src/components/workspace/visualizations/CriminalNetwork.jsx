// TODO: Replace with React Flow interactive network graph
// Expected data format: { nodes: [{ id, label, group, firCount }], edges: [{ source, target, label }] }
export default function CriminalNetwork({ data }) {
  if (!data?.nodes) {
    return <div className="text-on-surface-variant/60 text-sm">No network data available</div>
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">
            Network Connections
          </span>
          <span className="text-xs text-on-surface-variant/40">
            {data.nodes.length} individuals · {data.edges?.length || 0} connections
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.nodes.map((n) => (
            <div
              key={n.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                n.group === 'central'
                  ? 'bg-error/10 text-error border-error/20'
                  : 'bg-amber-100/30 text-amber-700 border-amber-200/30'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${n.group === 'central' ? 'bg-error' : 'bg-amber-500'}`} />
              <span className="font-medium">{n.label}</span>
              <span className="opacity-60">({n.firCount} cases)</span>
            </div>
          ))}
        </div>
        {data.edges && (
          <div className="mt-4 pt-3 border-t border-slate-200/20">
            <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">Connections</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.edges.map((e, i) => {
                const source = data.nodes.find((n) => n.id === e.source)
                const target = data.nodes.find((n) => n.id === e.target)
                return (
                  <span key={i} className="text-xs px-2 py-1 bg-white/40 rounded-full">
                    {source?.label || e.source} → {target?.label || e.target}
                    <span className="text-on-surface-variant/40 ml-1">({e.label})</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
