// TODO: Replace with React Leaflet or Mapbox interactive map
export default function LiveHotspots() {
  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">map</span>
          Live Hotspots
        </h3>
        <div className="flex gap-2">
          <button className="px-5 py-2 text-xs font-bold bg-white text-slate-600 border border-outline-variant rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            Expand Map
          </button>
          <button className="px-5 py-2 text-xs font-bold bg-primary/10 text-primary border border-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
            Filter Layers
          </button>
        </div>
      </div>
      <div className="h-96 relative rounded-2xl overflow-hidden border border-outline-variant shadow-inner group">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{
            backgroundImage: "url('https://placehold.co/1200x600/e2e8f0/94a3b8?text=Crime+Heatmap')",
            filter: 'saturate(0.8) contrast(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
        <div className="absolute top-1/3 left-1/4 w-6 h-6 bg-error rounded-full animate-ping opacity-75" />
        <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-error rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
        <div className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-error rounded-full animate-ping opacity-75" />
        <div className="absolute bottom-1/3 right-1/3 w-2.5 h-2.5 bg-error rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
        <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-xl p-5 rounded-xl border border-white shadow-xl max-w-xs">
          <p className="text-sm font-extrabold text-error mb-1">Bengaluru East Sector</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            High probability alert: Street Crime Cluster detected via pattern analysis.
          </p>
          <button className="mt-4 w-full py-2.5 bg-primary text-on-primary text-[10px] font-extrabold rounded-lg uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] transition-all">
            Dispatch Nearest Unit
          </button>
        </div>
      </div>
    </section>
  )
}
