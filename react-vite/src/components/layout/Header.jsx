export default function Header() {
  return (
    <header className="flex justify-between items-center w-full px-10 h-20 sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-outline-variant">
      <div className="flex items-center gap-4">
        <img
          alt="KSP Logo"
          className="h-10 w-auto"
          src="/ksp-logo.png"
        />
        <h1 className="text-xl font-bold text-on-surface tracking-tight">
          KSP <span className="text-primary">Lumina</span>
        </h1>
        <div className="hidden xl:flex items-center bg-slate-100/50 px-5 py-2.5 rounded-full border border-outline-variant w-96 ml-6">
          <span className="material-symbols-outlined text-slate-400 mr-2 text-xl">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 outline-none"
            placeholder="Search investigative data..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex bg-slate-100 rounded-xl p-1 border border-outline-variant">
          <button className="px-4 py-1.5 text-xs font-bold bg-white text-on-surface shadow-sm rounded-lg">English</button>
          <button className="px-4 py-1.5 text-xs font-medium text-slate-500 hover:text-on-surface transition-colors">ಕನ್ನಡ</button>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2.5 text-slate-500 hover:text-primary transition-colors relative group" title="Toggle Theme">
            <span className="material-symbols-outlined">dark_mode</span>
            <span className="absolute inset-0 bg-primary/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button className="p-2.5 text-slate-500 hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-white" />
          </button>
          <button className="p-2.5 text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">translate</span>
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-on-surface font-bold leading-tight">IG R. Bharadwaj</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CID Division</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 overflow-hidden bg-slate-100">
            <div className="w-full h-full object-cover bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-sm">
              RB
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
