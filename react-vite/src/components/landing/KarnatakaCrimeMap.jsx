import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { useLanguage } from '../../contexts/LanguageContext'

const KARNATAKA_CENTER = [15.3173, 75.7139]
const KARNATAKA_BOUNDS = [
  [11.5, 74.0],
  [18.5, 78.6],
]
const DEFAULT_ZOOM = 7

function HeatLayer({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return undefined

    const heatPoints = points.map((p) => [p.lat, p.lng, Math.max(p.caseCount, 1)])
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 32,
      blur: 24,
      maxZoom: 12,
      gradient: { 0.2: '#3B82F6', 0.5: '#F59E0B', 0.8: '#DC2626' },
    }).addTo(map)

    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, points])

  return null
}

function LocationMarker({ location }) {
  const radius = 5 + Math.min(location.caseCount, 10) * 1.2

  return (
    <CircleMarker
      center={[location.lat, location.lng]}
      radius={radius}
      pathOptions={{
        color: '#DC2626',
        fillColor: '#DC2626',
        fillOpacity: 0.85,
        weight: 1.5,
      }}
    >
      <Popup>
        <div className="text-xs space-y-1.5 min-w-[180px]">
          <p className="font-bold text-sm text-slate-900">
            {location.city || location.taluk || location.district}
          </p>
          <p className="text-slate-500">
            {[location.taluk, location.district].filter(Boolean).join(', ')}
            {location.pincode ? ` — ${location.pincode}` : ''}
          </p>
          <p className="font-semibold text-slate-700">
            {location.caseCount} FIR case{location.caseCount === 1 ? '' : 's'}
          </p>
          {location.cases.length > 0 && (
            <ul className="space-y-1 pt-1 border-t border-slate-200 max-h-32 overflow-y-auto">
              {location.cases.map((c) => (
                <li key={c.firNumber} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-primary">{c.firNumber}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ color: c.priorityColor, backgroundColor: `${c.priorityColor}18` }}
                  >
                    {c.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}

export default function KarnatakaCrimeMap({ locations = [], loading, error }) {
  const { t } = useLanguage()

  const points = useMemo(() => locations.filter((l) => l.lat != null && l.lng != null), [locations])

  if (loading && locations.length === 0) {
    return (
      <div className="h-96 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
        <span className="material-symbols-outlined text-slate-400 animate-spin">progress_activity</span>
      </div>
    )
  }

  if (error && locations.length === 0) {
    return (
      <div className="h-96 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="material-symbols-outlined text-4xl text-red-400">error_outline</span>
        <p className="text-sm text-red-500 font-medium">{t('common.error') || 'Failed to load hotspot data'}</p>
      </div>
    )
  }

  return (
    <div className="h-96 rounded-2xl overflow-hidden border border-outline-variant dark:border-slate-700 shadow-inner">
      <MapContainer
        center={KARNATAKA_CENTER}
        zoom={DEFAULT_ZOOM}
        maxBounds={KARNATAKA_BOUNDS}
        maxBoundsViscosity={0.6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <HeatLayer points={points} />
        {points.map((location) => (
          <LocationMarker key={location.id} location={location} />
        ))}
      </MapContainer>
    </div>
  )
}
