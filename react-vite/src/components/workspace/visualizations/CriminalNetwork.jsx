import { lazy, Suspense } from 'react'

const NetworkGraph = lazy(() => import('./NetworkGraph'))

export default function CriminalNetwork({ data }) {
  return (
    <Suspense fallback={
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-on-surface-variant/60 dark:text-slate-400">Loading graph...</p>
        </div>
      </div>
    }>
      <NetworkGraph data={data} />
    </Suspense>
  )
}
