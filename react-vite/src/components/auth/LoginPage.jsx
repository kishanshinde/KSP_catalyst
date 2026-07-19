import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-primary selection:text-white">
      {/* Background Animated Gradient Mesh & Security Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Decorative Security Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic SSO Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800 shadow-2xl shadow-blue-950/40 text-center">
        
        {/* KSP Emblem & Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4 group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500" />
            <img
              src="/ksp-logo.png"
              alt="Karnataka State Police Emblem"
              className="relative h-20 w-auto drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            KARNATAKA STATE POLICE
          </h1>
          <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mt-1">
            LUMINA CRIME INTELLIGENCE PORTAL
          </p>
        </div>

        {/* Security Info Badge */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="material-symbols-outlined text-blue-400 text-lg">verified_user</span>
            <span>Zoho Catalyst Enterprise Single Sign-On</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Authentication is required to access restricted crime databases, FIR investigations, and intelligence analytics.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={login}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          <span className="material-symbols-outlined text-xl">shield</span>
          <span>Sign In with Zoho Catalyst SSO</span>
          <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>

        {/* Security Footer Note */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">RESTRICTED ACCESS</span>
          </div>
          <div>ENC: AES-512 QUANTUM-SAFE</div>
        </div>
      </div>
    </div>
  )
}
