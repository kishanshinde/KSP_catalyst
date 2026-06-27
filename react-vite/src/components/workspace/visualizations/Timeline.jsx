// TODO: Replace with interactive timeline component using Recharts or custom implementation
// Expected data format: { events: [{ date, title, description, type }] }
export default function Timeline({ data }) {
  if (!data?.events) {
    return <div className="text-on-surface-variant/60 text-sm">No timeline data available</div>
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-on-surface-variant/60 uppercase tracking-wider">
            Investigation Timeline
          </span>
          <span className="text-xs text-on-surface-variant/40">{data.events.length} events</span>
        </div>
        <div className="relative pl-6 space-y-0">
          <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-surface-container-highest" />
          {data.events.map((event, i) => (
            <div key={i} className="relative pb-5 last:pb-0">
              <div className={`absolute left-[-14px] top-1.5 w-3 h-3 rounded-full border-2 ${
                event.type === 'milestone'
                  ? 'bg-primary border-primary'
                  : 'bg-white border-primary/40'
              }`} />
              <div className="glass rounded-lg p-3 ml-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-on-surface">{event.title}</span>
                  <span className="text-xs text-on-surface-variant/40">{event.date}</span>
                </div>
                {event.description && (
                  <p className="text-xs text-on-surface-variant/70">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
