// TODO: Replace with React Flow interactive network graph
export default function CriminalNetworkViz() {
  return (
    <section className="glass-panel rounded-2xl overflow-hidden mb-10">
      <div className="border-b border-slate-100 p-6 flex justify-between items-center bg-white/40">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">share</span>
          <h3 className="text-lg font-bold text-slate-900">Criminal Network Visualization</h3>
        </div>
        <div className="flex gap-5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-error" /> Primary Suspect
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Associate
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Organization
          </div>
        </div>
      </div>
      <div className="h-80 relative bg-white/50">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(#004ac6 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <svg className="w-full h-full">
          <line stroke="#e2e8f0" strokeWidth="2" x1="20%" x2="45%" y1="50%" y2="35%" />
          <line stroke="#e2e8f0" strokeWidth="2" x1="20%" x2="45%" y1="50%" y2="65%" />
          <line stroke="#004ac6" strokeDasharray="6" strokeWidth="2" x1="45%" x2="70%" y1="35%" y2="35%" />
          <line stroke="#e2e8f0" strokeWidth="2" x1="70%" x2="85%" y1="35%" y2="50%" />
          <g transform="translate(580, 140)">
            <circle fill="#fff" r="35" stroke="#ef4444" strokeWidth="3" />
            <text fill="#ef4444" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" y="5">SUSPECT_A</text>
          </g>
          <g transform="translate(350, 180)">
            <circle fill="#fff" r="24" stroke="#004ac6" strokeWidth="2" />
            <text fill="#1e293b" fontFamily="JetBrains Mono" fontSize="9" fontWeight="bold" textAnchor="middle" y="4">ASSOC_1</text>
          </g>
          <g transform="translate(800, 180)">
            <circle fill="#fff" r="24" stroke="#004ac6" strokeWidth="2" />
            <text fill="#1e293b" fontFamily="JetBrains Mono" fontSize="9" fontWeight="bold" textAnchor="middle" y="4">ASSOC_2</text>
          </g>
        </svg>
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md p-5 rounded-xl max-w-xs border border-white shadow-lg">
          <p className="text-xs font-extrabold text-primary mb-2 uppercase tracking-widest">Intelligence Insight</p>
          <p className="text-xs leading-relaxed text-slate-600 font-medium">
            The &ldquo;Gaurav S.&rdquo; syndicate shows high overlap with the 2024 Hawala channel. Recommended cross-reference with CID-Finance DB.
          </p>
        </div>
        <button className="absolute bottom-6 right-6 bg-white px-6 py-2.5 rounded-lg border border-outline-variant text-xs font-bold text-slate-600 shadow-sm hover:border-primary transition-all">
          Full Network View
        </button>
      </div>
    </section>
  )
}
