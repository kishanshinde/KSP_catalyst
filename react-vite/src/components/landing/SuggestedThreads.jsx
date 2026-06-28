// TODO: Replace with AI-generated suggestions from backend intent service
export default function SuggestedThreads({ onSelect }) {
  const threads = [
    '"Show all repeat offenders connected to FIR-2026-0012"',
    '"Analyze crime trends in Bengaluru East"',
    '"Find financial links in cybercrime cases"',
  ]

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <p className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Suggested Threads</p>
      {threads.map((t, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(t.replace(/"/g, ''))}
          className="bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full text-xs font-semibold text-slate-600 border border-white hover:border-primary/30 hover:bg-white hover:text-primary transition-all shadow-sm"
        >
          {t}
        </button>
      ))}
    </div>
  )
}
