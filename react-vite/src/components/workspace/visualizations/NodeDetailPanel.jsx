import { useLanguage } from '../../../contexts/LanguageContext'

const TYPE_LABELS = {
  accused: 'Accused',
  victim: 'Victim',
  fir: 'FIR',
  location: 'Location',
  mo: 'Modus Operandi',
  central: 'Central Node',
}

const ROLE_STYLES = {
  LEADER: 'bg-red-500/20 text-red-400 border-red-500/30',
  BROKER: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  HUB: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  HABITUAL: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  MEMBER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const STATUS_STYLES = {
  Open: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Under Investigation': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Registered: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export default function NodeDetailPanel({ node, edges, allNodes, onClose }) {
  const { t } = useLanguage()
  if (!node) return null

  const connectedEdges = (edges || []).filter(e => {
    const src = e.source?.id || e.source
    const tgt = e.target?.id || e.target
    return src === node.id || tgt === node.id
  })

  const linkedNodes = connectedEdges.map(e => {
    const src = e.source?.id || e.source
    const tgt = e.target?.id || e.target
    const otherId = src === node.id ? tgt : src
    const otherNode = (allNodes || []).find(n => n.id === otherId)
    return { edge: e, node: otherNode }
  })

  return (
    <div className="h-full flex flex-col bg-[#0F1118]/95 border-l border-slate-800/50 backdrop-blur-md overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">{node.label}</h3>
            <span className="text-[10px] text-slate-400">{TYPE_LABELS[node.type] || node.type}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
        </div>

        {/* Risk Score */}
        {node.risk_score != null && node.risk_score > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
              {t('workspace.riskScore') || 'Risk Score'}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${node.risk_score}%`,
                  backgroundColor: node.risk_score >= 70 ? '#EF4444' : node.risk_score >= 40 ? '#EAB308' : '#22C55E',
                }} />
              </div>
              <span className="text-xs text-white font-medium">{node.risk_score}</span>
            </div>
          </div>
        )}

        {/* Repeat Offender Badge */}
        {node.is_repeat_offender && (
          <div className="mb-4 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md">
            <span className="text-[10px] text-red-400 font-medium">Repeat Offender</span>
          </div>
        )}

        {/* Role Badge */}
        {node.role && (
          <div className="mb-4">
            <span className={`text-[10px] px-2 py-0.5 rounded border ${ROLE_STYLES[node.role] || ROLE_STYLES.MEMBER}`}>
              {node.role}
            </span>
          </div>
        )}

        {/* Status Badge (FIR) */}
        {node.status && (
          <div className="mb-4">
            <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_STYLES[node.status] || STATUS_STYLES.Registered}`}>
              {node.status}
            </span>
          </div>
        )}

        {/* Entity Details */}
        <div className="space-y-2 mb-4">
          {node.gender && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.gender') || 'Gender'}</span>
              <span className="text-slate-300">{node.gender}</span>
            </div>
          )}
          {node.occupation && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.occupation') || 'Occupation'}</span>
              <span className="text-slate-300">{node.occupation}</span>
            </div>
          )}
          {node.date_registered && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.registered') || 'Registered'}</span>
              <span className="text-slate-300">{node.date_registered}</span>
            </div>
          )}
          {node.crime_name && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.crimeType') || 'Crime'}</span>
              <span className="text-slate-300">{node.crime_name}</span>
            </div>
          )}
          {node.parent_category && node.parent_category !== 'Unknown' && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.category') || 'Category'}</span>
              <span className="text-slate-300">{node.parent_category}</span>
            </div>
          )}
          {node.priority && node.priority !== 'Unknown' && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.priority') || 'Priority'}</span>
              <span className="text-slate-300">{node.priority}</span>
            </div>
          )}
          {node.city && node.city !== 'Unknown' && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.city') || 'City'}</span>
              <span className="text-slate-300">{node.city}</span>
            </div>
          )}
          {node.district && node.district !== 'Unknown' && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.district') || 'District'}</span>
              <span className="text-slate-300">{node.district}</span>
            </div>
          )}
          {node.description && (
            <div className="text-[11px]">
              <span className="text-slate-500 block mb-1">{t('workspace.description') || 'Description'}</span>
              <span className="text-slate-300">{node.description}</span>
            </div>
          )}
          {node.fir_count != null && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{t('workspace.firs') || 'FIRs'}</span>
              <span className="text-slate-300">{node.fir_count}</span>
            </div>
          )}
        </div>

        {/* Linked Entities */}
        {linkedNodes.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
              {t('workspace.connections') || 'Connections'} ({linkedNodes.length})
            </div>
            <div className="space-y-1">
              {linkedNodes.slice(0, 20).map(({ edge, node: linked }, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-slate-800/40">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{
                    backgroundColor: linked?.type === 'accused' ? '#EF4444'
                      : linked?.type === 'victim' ? '#3B82F6'
                      : linked?.type === 'fir' ? '#EAB308'
                      : linked?.type === 'location' ? '#22C55E'
                      : linked?.type === 'mo' ? '#A855F7' : '#6B7280'
                  }} />
                  <span className="text-[11px] text-slate-300 truncate">{linked?.label || 'Unknown'}</span>
                  <span className="text-[9px] text-slate-600 ml-auto shrink-0">{edge.type}</span>
                </div>
              ))}
              {linkedNodes.length > 20 && (
                <div className="text-[10px] text-slate-500 pl-2">
                  +{linkedNodes.length - 20} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
