import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useLanguage } from '../../../contexts/LanguageContext'

const TYPE_COLORS = {
  central: '#FFFFFF',
  accused: '#EF4444',
  victim: '#3B82F6',
  fir: '#EAB308',
  location: '#22C55E',
  mo: '#A855F7',
}

const EDGE_COLORS = {
  ACCUSED_OF: '#EF4444',
  VICTIM_OF: '#3B82F6',
  LOCATED_AT: '#22C55E',
  USES_MO: '#A855F7',
  CO_ACCUSED: '#F97316',
  SHARED_LOCATION: '#14B8A6',
}

const COMMUNITY_COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7',
  '#F97316', '#EC4899', '#06B6D4', '#8B5CF6', '#10B981',
]

function getNodeRadius(node) {
  const base = { central: 28, accused: 14, victim: 10, fir: 12, location: 9, mo: 7 }
  let r = base[node.type] || 10
  if ((node.type === 'accused' || node.type === 'central') && node.risk_score) {
    r = 10 + (node.risk_score / 100) * 14
  }
  if (node.type === 'central') r = 30
  return r
}

export default function NetworkGraph({ data, onNodeSelect }) {
  const { t } = useLanguage()
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const animRef = useRef(null)
  const dragRef = useRef(null)
  const panRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, panning: false })
  const zoomRef = useRef(1)
  const simAlphaRef = useRef(1)

  const graphData = data?.nodes ? data : null

  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState(null)
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 })
  const [filters, setFilters] = useState({
    accused: true, victim: true, fir: true, location: true, mo: true,
  })
  const [searchQuery, setSearchQuery] = useState('')

  const filteredData = useMemo(() => {
    if (!graphData?.nodes) return { nodes: [], edges: [] }
    const activeFilters = Object.entries(filters).filter(([, v]) => v).map(([k]) => k)
    const visibleNodes = graphData.nodes.filter(n => {
      if (!activeFilters.includes(n.type) && n.type !== 'central') return false
      if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    const visibleIds = new Set(visibleNodes.map(n => n.id))
    const visibleEdges = graphData.edges.filter(e =>
      visibleIds.has(e.source?.id || e.source) && visibleIds.has(e.target?.id || e.target)
    )
    return { nodes: visibleNodes, edges: visibleEdges }
  }, [graphData, filters, searchQuery])

  const highlightedIds = useMemo(() => {
    if (!selectedNode || !graphData?.edges) return null
    const ids = new Set([selectedNode.id])
    for (const e of graphData.edges) {
      const src = e.source?.id || e.source
      const tgt = e.target?.id || e.target
      if (src === selectedNode.id) ids.add(tgt)
      if (tgt === selectedNode.id) ids.add(src)
    }
    return ids
  }, [selectedNode, graphData])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width: width || 500, height: height || 500 })
      }
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const cx = dimensions.width / 2
    const cy = dimensions.height / 2
    const existingMap = new Map(nodesRef.current.map(n => [n.id, n]))
    nodesRef.current = filteredData.nodes.map(n => {
      const existing = existingMap.get(n.id)
      return {
        ...n,
        x: existing?.x ?? cx + (Math.random() - 0.5) * 300,
        y: existing?.y ?? cy + (Math.random() - 0.5) * 300,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        r: getNodeRadius(n),
        color: n.type === 'central' ? TYPE_COLORS.central : TYPE_COLORS[n.type] || '#6B7280',
      }
    })
    edgesRef.current = filteredData.edges.map(e => ({
      ...e,
      source: e.source?.id || e.source,
      target: e.target?.id || e.target,
      color: EDGE_COLORS[e.type] || '#FFFFFF',
      width: e.type === 'CO_ACCUSED' ? 3 : 2,
    }))
    simAlphaRef.current = 1
  }, [filteredData, dimensions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const draw = () => {
      const { width, height } = dimensions
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      ctx.fillStyle = '#0A0C14'
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.translate(panRef.current.x, panRef.current.y)
      ctx.scale(zoomRef.current, zoomRef.current)

      const nodes = nodesRef.current
      const edges = edgesRef.current
      const alpha = simAlphaRef.current
      const nodeMap = new Map(nodes.map(n => [n.id, n]))

      if (alpha > 0.001) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            let dx = nodes[j].x - nodes[i].x
            let dy = nodes[j].y - nodes[i].y
            let dist = Math.sqrt(dx * dx + dy * dy) || 1
            const minDist = (nodes[i].r + nodes[j].r) * 1.8
            if (dist < minDist) {
              const force = (minDist - dist) / dist * 0.5 * alpha
              nodes[i].vx -= dx * force
              nodes[i].vy -= dy * force
              nodes[j].vx += dx * force
              nodes[j].vy += dy * force
            }
          }
        }

        for (const e of edges) {
          const s = nodeMap.get(e.source)
          const t = nodeMap.get(e.target)
          if (!s || !t) continue
          let dx = t.x - s.x
          let dy = t.y - s.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 1
          const idealDist = e.type === 'CO_ACCUSED' ? 60 : e.type === 'ACCUSED_OF' ? 80 : 90
          const force = (dist - idealDist) / dist * 0.06 * alpha
          s.vx += dx * force
          s.vy += dy * force
          t.vx -= dx * force
          t.vy -= dy * force
        }

        for (const n of nodes) {
          n.vx += (width / 2 - n.x) * 0.003 * alpha
          n.vy += (height / 2 - n.y) * 0.003 * alpha
          const charge = (n.type === 'central' ? -400 : n.type === 'accused' ? -150 : -80) * alpha
          for (const m of nodes) {
            if (m === n) continue
            let dx = n.x - m.x
            let dy = n.y - m.y
            let dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = charge / (dist * dist)
            n.vx += (dx / dist) * force
            n.vy += (dy / dist) * force
          }
        }

        for (const n of nodes) {
          if (dragRef.current?.id === n.id) continue
          n.vx *= 0.6
          n.vy *= 0.6
          n.x += n.vx
          n.y += n.vy
        }
        simAlphaRef.current *= 0.995
      }

      for (const e of edges) {
        const s = nodeMap.get(e.source)
        const t = nodeMap.get(e.target)
        if (!s || !t) continue
        const sx = s.x, sy = s.y, tx = t.x, ty = t.y
        const dx = tx - sx, dy = ty - sy
        const dimmed = highlightedIds && !highlightedIds.has(e.source) && !highlightedIds.has(e.target)
        const weight = e.weight || 1
        const wAlpha = 0.5 + weight * 0.17

        ctx.beginPath()
        const curve = 0.15
        const mx = (sx + tx) / 2 + dy * curve
        const my = (sy + ty) / 2 - dx * curve
        ctx.moveTo(sx, sy)
        ctx.quadraticCurveTo(mx, my, tx, ty)
        ctx.strokeStyle = e.color || '#FFFFFF'
        ctx.globalAlpha = dimmed ? 0.08 : wAlpha
        ctx.lineWidth = (e.width || 2) * (0.7 + weight * 0.3)
        ctx.stroke()

        const angle = Math.atan2(dy, dx)
        const aLen = 10
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx - aLen * Math.cos(angle - 0.45), ty - aLen * Math.sin(angle - 0.45))
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx - aLen * Math.cos(angle + 0.45), ty - aLen * Math.sin(angle + 0.45))
        ctx.globalAlpha = dimmed ? 0.08 : 0.8
        ctx.lineWidth = 2
        ctx.stroke()
      }

      for (const n of nodes) {
        const dimmed = highlightedIds && !highlightedIds.has(n.id)
        const r = n.r

        if (n.community_id != null && n.type !== 'location' && n.type !== 'mo' && n.type !== 'fir') {
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 16, 0, 2 * Math.PI)
          ctx.fillStyle = COMMUNITY_COLORS[n.community_id % COMMUNITY_COLORS.length]
          ctx.globalAlpha = dimmed ? 0.04 : 0.15
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 4, 0, 2 * Math.PI)
        ctx.strokeStyle = n.color
        ctx.globalAlpha = dimmed ? 0.08 : 0.6
        ctx.lineWidth = n.type === 'central' ? 4 : 3
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, 2 * Math.PI)
        ctx.fillStyle = n.color
        ctx.globalAlpha = dimmed ? 0.15 : 1
        ctx.fill()

        if (r > 8) {
          const gradient = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r)
          gradient.addColorStop(0, 'rgba(255,255,255,0.45)')
          gradient.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.fillStyle = gradient
          ctx.globalAlpha = dimmed ? 0.08 : 0.6
          ctx.fill()
        }

        if (selectedNode && n.id === selectedNode.id) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 7, 0, 2 * Math.PI)
          ctx.strokeStyle = '#60A5FA'
          ctx.globalAlpha = 0.8
          ctx.lineWidth = 2
          ctx.setLineDash([4, 3])
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.globalAlpha = 1
        const fontSize = n.type === 'central' ? 13 : 11
        ctx.font = `${n.type === 'central' ? 'bold ' : ''}${fontSize}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.globalAlpha = dimmed ? 0.12 : 0.95
        ctx.fillStyle = 'rgba(0,0,0,0.95)'
        ctx.fillText(n.label, n.x + 1, n.y + r + 6)
        ctx.fillText(n.label, n.x, n.y + r + 7)
        ctx.fillStyle = n.type === 'central' ? '#FFFFFF'
          : n.type === 'fir' ? '#FCD34D'
          : n.type === 'victim' ? '#93C5FD'
          : n.type === 'mo' ? '#C4B5FD'
          : n.type === 'location' ? '#86EFAC' : '#E2E8F0'
        ctx.fillText(n.label, n.x, n.y + r + 6)
      }

      ctx.globalAlpha = 1
      ctx.restore()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [dimensions, selectedNode, highlightedIds])

  const screenToGraph = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    return {
      x: (sx - panRef.current.x) / zoomRef.current,
      y: (sy - panRef.current.y) / zoomRef.current,
    }
  }, [])

  const findNodeAt = useCallback((clientX, clientY) => {
    const { x, y } = screenToGraph(clientX, clientY)
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i]
      const dx = x - n.x, dy = y - n.y
      if (dx * dx + dy * dy <= (n.r + 6) * (n.r + 6)) return n
    }
    return null
  }, [screenToGraph])

  const handleMouseDown = useCallback((e) => {
    const node = findNodeAt(e.clientX, e.clientY)
    if (node) {
      dragRef.current = { id: node.id, startX: e.clientX, startY: e.clientY }
      simAlphaRef.current = 0.3
    } else {
      panRef.current.panning = true
      panRef.current.startX = e.clientX - panRef.current.x
      panRef.current.startY = e.clientY - panRef.current.y
    }
  }, [findNodeAt])

  const handleMouseMove = useCallback((e) => {
    if (dragRef.current) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.id)
      if (node) {
        const { x, y } = screenToGraph(e.clientX, e.clientY)
        node.x = x
        node.y = y
        node.vx = 0
        node.vy = 0
        simAlphaRef.current = 0.1
      }
      return
    }
    if (panRef.current.panning) {
      panRef.current.x = e.clientX - panRef.current.startX
      panRef.current.y = e.clientY - panRef.current.startY
      return
    }
    const node = findNodeAt(e.clientX, e.clientY)
    setHoveredNode(node)
    if (node) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      canvasRef.current.style.cursor = 'pointer'
    } else {
      setTooltipPos(null)
      canvasRef.current.style.cursor = 'grab'
    }
  }, [findNodeAt, screenToGraph])

  const handleMouseUp = useCallback((e) => {
    if (dragRef.current) {
      const moved = Math.abs(e.clientX - dragRef.current.startX) + Math.abs(e.clientY - dragRef.current.startY)
      if (moved < 5) {
        const node = nodesRef.current.find(n => n.id === dragRef.current.id)
        if (node) {
          const next = selectedNode?.id === node.id ? null : node
          setSelectedNode(next)
          onNodeSelect?.(next)
        }
      }
      dragRef.current = null
      return
    }
    if (panRef.current.panning) {
      panRef.current.panning = false
      return
    }
    const node = findNodeAt(e.clientX, e.clientY)
    if (node) {
      const next = selectedNode?.id === node.id ? null : node
      setSelectedNode(next)
      onNodeSelect?.(next)
    } else {
      setSelectedNode(null)
      onNodeSelect?.(null)
    }
  }, [findNodeAt, selectedNode, onNodeSelect])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.2, Math.min(5, zoomRef.current * delta))
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    panRef.current.x = mx - (mx - panRef.current.x) * (newZoom / zoomRef.current)
    panRef.current.y = my - (my - panRef.current.y) * (newZoom / zoomRef.current)
    zoomRef.current = newZoom
  }, [])

  const toggleFilter = (type) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }))
  }

  if (!graphData?.nodes) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant/60 dark:text-slate-500 text-sm">
        {t('workspace.noData')}
      </div>
    )
  }

  const connectedEdges = selectedNode
    ? (graphData.edges || []).filter(e => {
        const src = e.source?.id || e.source
        const tgt = e.target?.id || e.target
        return src === selectedNode.id || tgt === selectedNode.id
      })
    : []

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] bg-[#0A0C14] rounded-xl overflow-hidden">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder={t('workspace.searchNodes') || 'Search nodes...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/50 w-36"
        />
        {Object.entries(filters).map(([type, active]) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
              active ? 'border-opacity-50 text-white' : 'border-slate-700 text-slate-600 bg-transparent'
            }`}
            style={active ? {
              borderColor: TYPE_COLORS[type] + '80',
              backgroundColor: TYPE_COLORS[type] + '20',
              color: TYPE_COLORS[type],
            } : {}}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-10 text-[10px] text-slate-500 bg-slate-900/60 px-2 py-1 rounded-md">
        {graphData.nodes.length} {t('workspace.nodes') || 'nodes'} &middot; {graphData.edges.length} {t('workspace.edges') || 'edges'}
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setHoveredNode(null); dragRef.current = null; panRef.current.panning = false }}
        onWheel={handleWheel}
        className="w-full h-full"
      />

      {hoveredNode && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg bg-slate-900/95 border border-slate-700/60 shadow-xl backdrop-blur-sm"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y + 12 }}
        >
          <div className="text-sm font-medium text-white">{hoveredNode.label}</div>
          <div className="text-[10px] text-slate-400 capitalize">{hoveredNode.type}</div>
          {hoveredNode.risk_score > 0 && (
            <div className="text-[10px] text-red-400">Risk: {hoveredNode.risk_score}</div>
          )}
        </div>
      )}

      {selectedNode && (
        <div className="absolute right-0 top-0 h-full w-64 bg-[#0F1118]/95 border-l border-slate-800/50 backdrop-blur-md overflow-y-auto z-20">
          <div className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">{selectedNode.label}</h3>
                <span className="text-[10px] text-slate-400 capitalize">{selectedNode.type}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
            </div>

            {selectedNode.risk_score != null && selectedNode.risk_score > 0 && (
              <div className="mb-4">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{t('workspace.riskScore') || 'Risk Score'}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${selectedNode.risk_score}%`,
                      backgroundColor: selectedNode.risk_score >= 70 ? '#EF4444' : selectedNode.risk_score >= 40 ? '#EAB308' : '#22C55E',
                    }} />
                  </div>
                  <span className="text-xs text-white font-medium">{selectedNode.risk_score}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {selectedNode.gender && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{t('workspace.gender') || 'Gender'}</span>
                  <span className="text-slate-300">{selectedNode.gender}</span>
                </div>
              )}
              {selectedNode.occupation && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{t('workspace.occupation') || 'Occupation'}</span>
                  <span className="text-slate-300">{selectedNode.occupation}</span>
                </div>
              )}
              {selectedNode.role && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{t('workspace.role') || 'Role'}</span>
                  <span className="text-slate-300">{selectedNode.role}</span>
                </div>
              )}
              {selectedNode.total_cases > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{t('workspace.cases') || 'Cases'}</span>
                  <span className="text-slate-300">{selectedNode.total_cases}</span>
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                {t('workspace.connections') || 'Connections'} ({connectedEdges.length})
              </div>
              <div className="space-y-1">
                {connectedEdges.slice(0, 15).map((edge, i) => {
                  const src = edge.source?.id || edge.source
                  const tgt = edge.target?.id || edge.target
                  const otherId = src === selectedNode.id ? tgt : src
                  const otherNode = graphData.nodes.find(n => n.id === otherId)
                  return (
                    <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-slate-800/40 cursor-pointer">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[otherNode?.type] || '#6B7280' }} />
                      <span className="text-[11px] text-slate-300 truncate">{otherNode?.label || otherId}</span>
                      <span className="text-[9px] text-slate-600 ml-auto shrink-0">{edge.type}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-[10px] z-10">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>

      <div className="absolute bottom-3 right-3 text-[10px] text-slate-600 z-10">
        Click to select &middot; Drag nodes &middot; Scroll to zoom &middot; Drag background to pan
      </div>
    </div>
  )
}
