import { useLanguage } from '../../contexts/LanguageContext'
import useCrimeHeatmap from '../../hooks/useCrimeHeatmap'
import KarnatakaCrimeMap from './KarnatakaCrimeMap'

export default function LiveHotspots() {
  const { t } = useLanguage()
  const { data, loading, error } = useCrimeHeatmap()

  return (
    <section className="glass-panel p-8 rounded-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">map</span>
          {t('landing.liveHotspots')}
        </h3>
        {data && (
          <span className="bg-primary/10 text-primary text-[11px] px-4 py-1.5 rounded-full font-extrabold uppercase tracking-widest">
            {data.totalCases} cases across {data.totalLocations} locations
          </span>
        )}
      </div>
      <KarnatakaCrimeMap locations={data?.locations || []} loading={loading} error={error} />
    </section>
  )
}
