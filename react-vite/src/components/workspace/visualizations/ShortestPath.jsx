import { useState } from 'react'
import { useLanguage } from '../../../contexts/LanguageContext'
import { mockCriminalNetworkData } from '../../../services/mockCriminalNetwork'

export default function ShortestPath({ data }) {
  const { t } = useLanguage()
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const dataWithMock = data?.nodes ? data : mockCriminalNetworkData

  if (!dataWithMock?.nodes) {
    return <div className="text-on-surface-variant/60 dark:text-slate-500 text-sm">{t('workspace.noData')}</div>
  }

  const persons = dataWithMock.nodes.filter(n => n.type === 'accused' || n.type === 'central' || n.type === 'victim')

  const findPath = () => {
    if (!source || !target) return
    setLoading(true)

    const srcNode = persons.find(p => p.label.toLowerCase().includes(source.toLowerCase()))
    const tgtNode = persons.find(p => p.label.toLowerCase().includes(target.toLowerCase()) && p.id !== srcNode?.id)

    if (!srcNode || !tgtNode) {
      setResult({ found: false, message: 'One or both persons not found' })
      setLoading(false)
      return
    }

    const adj = new Map()
    for (const n of dataWithMock.nodes) adj.set(n.id, [])
    for (const e of dataWithMock.edges) {
      const s = e.source?.id || e.source
      const t2 = e.target?.id || e.target
      if (adj.has(s)) adj.get(s).push(t2)
      if (adj.has(t2)) adj.get(t2).push(s)
    }

    const visited = new Set()
    const parent = new Map()
    const queue = [srcNode.id]
    visited.add(srcNode.id)
    let found = false

    while (queue.length > 0) {
      const current = queue.shift()
      if (current === tgtNode.id) { found = true; break }
      for (const neighbor of (adj.get(current) || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          parent.set(neighbor, current)
          queue.push(neighbor)
        }
      }
    }

    if (found) {
      const path = []
      let node = tgtNode.id
      while (node) { path.unshift(node); node = parent.get(node) }
      const pathNodes = path.map(id => dataWithMock.nodes.find(n => n.id === id)).filter(Boolean)
      const pathEdges = []
      for (let i = 0; i < path.length - 1; i++) {
        const edge = dataWithMock.edges.find(e =>
          (e.source?.id || e.source) === path[i] && (e.target?.id || e.target) === path[i + 1] ||
          (e.target?.id || e.target) === path[i] && (e.source?.id || e.source) === path[i + 1]
        )
        if (edge) pathEdges.push(edge)
      }
      setResult({ found: true, path: pathNodes, edges: pathEdges, hops: path.length - 1 })
    } else {
      setResult({ found: false, message: `No connection found between ${srcNode.label} and ${tgtNode.label}` })
    }

    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-4">
        <div className="text-xs font-medium text-on-surface-variant/60 dark:text-slate-400 uppercase tracking-wider mb-3">
          {t('workspace.findPath') || 'Find Shortest Path'}
        </div>
        <div className="space-y-2">
          <input
            type="text"
            placeholder={t('workspace.sourcePerson') || 'Source person...'}
            value={source}
            onChange={e => setSource(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white/40 dark:bg-slate-800/40 border border-slate-200/20 dark:border-slate-700/20 rounded-lg text-on-surface dark:text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50"
          />
          <input
            type="text"
            placeholder={t('workspace.targetPerson') || 'Target person...'}
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white/40 dark:bg-slate-800/40 border border-slate-200/20 dark:border-slate-700/20 rounded-lg text-on-surface dark:text-white placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={findPath}
            disabled={!source || !target || loading}
            className="w-full py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : (t('workspace.findConnection') || 'Find Connection')}
          </button>
        </div>
      </div>

      {result && (
        <div className="glass rounded-xl p-4">
          {result.found ? (
            <div>
              <div className="text-xs font-medium text-emerald-500 mb-2">
                {t('workspace.pathFound') || 'Path Found'} ({result.hops} {t('workspace.hops') || 'hops'})
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {result.path.map((node, i) => (
                  <span key={node.id} className="flex items-center gap-1">
                    <span className="px-2 py-1 text-xs rounded-md bg-white/40 dark:bg-slate-800/40 text-on-surface dark:text-white">
                      {node.label}
                    </span>
                    {i < result.edges.length && (
                      <span className="text-[9px] text-slate-500">&rarr;</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-500">{result.message}</div>
          )}
        </div>
      )}
    </div>
  )
}
