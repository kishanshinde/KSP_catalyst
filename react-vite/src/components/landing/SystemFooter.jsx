export default function SystemFooter() {
  return (
    <footer className="px-10 py-5 bg-white border-t border-outline-variant flex justify-between items-center">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
            KSP Lumina: Active
          </span>
        </div>
        <div className="text-[10px] font-bold font-mono text-slate-300">
          LAT: 12.9716° N | LONG: 77.5946° E
        </div>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-[10px] font-bold font-mono text-slate-300">
          ENC: AES-512 QUANTUM-SAFE
        </span>
        <span className="text-[10px] font-bold font-mono text-slate-400">
          SESSION: 04:22:15
        </span>
      </div>
    </footer>
  )
}
