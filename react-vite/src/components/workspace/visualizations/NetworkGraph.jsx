import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useTheme } from '../../../contexts/ThemeContext'

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
  HUB_LINK: '#6B7280',
  LEAF_LINK: '#6B7280',
}

const COMMUNITY_COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7',
  '#F97316', '#EC4899', '#06B6D4', '#8B5CF6', '#10B981',
]

const NO_HALO_TYPES = new Set(['location', 'mo', 'fir'])

function getNodeRadius(node) {
  const base = { central: 30, accused: 14, victim: 10, fir: 12, location: 9, mo: 7 }
  let r = base[node.type] || 10
  if ((node.type === 'accused' || node.type === 'central') && node.risk_score) {
    r = 10 + (node.risk_score / 100) * 14
  }
  if (node.type === 'central') r = 30
  return r
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

export default function NetworkGraph({ data, onNodeSelect }) {
  const { t } = useLanguage()
  const { isDark } = useTheme()
  const containerRef = useRef(null)
  const graphRef = useRef(null)

  const [dimensions, setDimensions] = useState({ width: 500, height: 500 })
  const [selectedNode, setSelectedNode] = useState(null)
  const [filters, setFilters] = useState({
    accused: true, victim: true, fir: true, location: true, mo: true,
  })
  const [searchQuery, setSearchQuery] = useState('')

  const graphData = data?.nodes ? data : null

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width: width || 500, height: height || 500 })
      }
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // Nodes whose label matches the search text — the search "hits" that the
  // rest of the visible subgraph is built around.
  const searchMatchIds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query || !graphData?.nodes) return null
    return new Set(
      graphData.nodes.filter((n) => n.label?.toLowerCase().includes(query)).map((n) => n.id)
    )
  }, [graphData, searchQuery])

  const filteredData = useMemo(() => {
    if (!graphData?.nodes) return { nodes: [], edges: [] }
    const activeFilters = Object.entries(filters).filter(([, v]) => v).map(([k]) => k)
    const typeVisible = (n) => activeFilters.includes(n.type) || n.type === 'central'

    // With an active search, show matched nodes plus everyone directly
    // connected to them (and the edges between), instead of collapsing the
    // graph down to isolated text matches with no relations shown.
    if (searchMatchIds) {
      if (searchMatchIds.size === 0) return { nodes: [], edges: [] }
      const relatedEdges = graphData.edges.filter((e) => {
        const src = e.source?.id || e.source
        const tgt = e.target?.id || e.target
        return searchMatchIds.has(src) || searchMatchIds.has(tgt)
      })
      const relatedIds = new Set(searchMatchIds)
      for (const e of relatedEdges) {
        relatedIds.add(e.source?.id || e.source)
        relatedIds.add(e.target?.id || e.target)
      }
      const visibleNodes = graphData.nodes.filter((n) => relatedIds.has(n.id) && typeVisible(n))
      const visibleIds = new Set(visibleNodes.map((n) => n.id))
      const visibleEdges = relatedEdges.filter((e) =>
        visibleIds.has(e.source?.id || e.source) && visibleIds.has(e.target?.id || e.target)
      )
      return { nodes: visibleNodes, edges: visibleEdges }
    }

    const visibleNodes = graphData.nodes.filter(typeVisible)
    const visibleIds = new Set(visibleNodes.map((n) => n.id))
    const visibleEdges = graphData.edges.filter((e) =>
      visibleIds.has(e.source?.id || e.source) && visibleIds.has(e.target?.id || e.target)
    )
    return { nodes: visibleNodes, edges: visibleEdges }
  }, [graphData, filters, searchMatchIds])

  // react-force-graph mutates node/link objects in place (adds x/y/vx/vy, and
  // resolves link.source/target from ids to node refs) — clone per filtered
  // set so switching filters/search doesn't feed it stale mutated objects.
  const graphPayload = useMemo(() => ({
    nodes: filteredData.nodes.map((n) => ({ ...n, isSearchMatch: searchMatchIds?.has(n.id) || false })),
    links: filteredData.edges.map((e) => ({ ...e })),
  }), [filteredData, searchMatchIds])

  const highlightedIds = useMemo(() => {
    if (!selectedNode) return null
    const ids = new Set([selectedNode.id])
    for (const e of filteredData.edges) {
      const src = e.source?.id || e.source
      const tgt = e.target?.id || e.target
      if (src === selectedNode.id) ids.add(tgt)
      if (tgt === selectedNode.id) ids.add(src)
    }
    return ids
  }, [selectedNode, filteredData])

  useEffect(() => {
    setSelectedNode(null)
  }, [graphData])

  // Default charge/link-distance is too weak once there are hundreds of
  // nodes in a small container — everything clumps into an unreadable ball.
  useEffect(() => {
    const chargeForce = graphRef.current?.d3Force('charge')
    if (chargeForce) chargeForce.strength(-140)
    const linkForce = graphRef.current?.d3Force('link')
    if (linkForce) linkForce.distance(60)
  }, [])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode((prev) => {
      const next = prev?.id === node.id ? null : node
      onNodeSelect?.(next)
      return next
    })
  }, [onNodeSelect])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null)
    onNodeSelect?.(null)
  }, [onNodeSelect])

  const handleEngineStop = useCallback(() => {
    if (!graphRef.current) return
    // A single disconnected node can drift far from the main cluster and
    // force zoomToFit to zoom out to include it, shrinking everything else
    // into an unreadable clump — fit to the connected subgraph instead when
    // there is one, ignoring isolated nodes.
    const degree = new Map()
    for (const link of graphPayload.links) {
      const s = link.source?.id || link.source
      const tg = link.target?.id || link.target
      degree.set(s, (degree.get(s) || 0) + 1)
      degree.set(tg, (degree.get(tg) || 0) + 1)
    }
    const hasConnected = graphPayload.nodes.some((n) => (degree.get(n.id) || 0) > 0)
    graphRef.current.zoomToFit(400, 60, hasConnected ? (node) => (degree.get(node.id) || 0) > 0 : undefined)
  }, [graphPayload])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    // Freshly-added nodes have no x/y until the force simulation ticks once —
    // skip drawing them that frame rather than feeding NaN into canvas calls.
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return

    const dimmed = highlightedIds && !highlightedIds.has(node.id)
    const r = getNodeRadius(node)
    const color = TYPE_COLORS[node.type] || '#6B7280'

    if (node.communityId != null && !NO_HALO_TYPES.has(node.type)) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 8, 0, 2 * Math.PI)
      ctx.fillStyle = COMMUNITY_COLORS[node.communityId % COMMUNITY_COLORS.length]
      ctx.globalAlpha = dimmed ? 0.04 : 0.15
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(node.x, node.y, r + 2.5, 0, 2 * Math.PI)
    ctx.strokeStyle = color
    ctx.globalAlpha = dimmed ? 0.1 : 0.6
    ctx.lineWidth = node.type === 'central' ? 3 : 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.globalAlpha = dimmed ? 0.15 : 1
    ctx.fill()

    if (r > 8) {
      const gradient = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r)
      gradient.addColorStop(0, 'rgba(255,255,255,0.45)')
      gradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gradient
      ctx.globalAlpha = dimmed ? 0.08 : 0.6
      ctx.fill()
    }

    if (selectedNode?.id === node.id) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI)
      ctx.strokeStyle = '#60A5FA'
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.setLineDash([])
    } else if (node.isSearchMatch) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI)
      ctx.strokeStyle = '#FBBF24'
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Hundreds of labels at once is unreadable soup — only draw them once
    // zoomed in enough to actually read, or for the selected/central node.
    const showLabel = globalScale > 1.1 || node.type === 'central' || selectedNode?.id === node.id || node.isSearchMatch
    if (showLabel) {
      const fontSize = (node.type === 'central' ? 13 : 11) / globalScale
      ctx.font = `${node.type === 'central' ? 'bold ' : ''}${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.globalAlpha = dimmed ? 0.15 : 0.95
      ctx.fillStyle = isDark ? '#E2E8F0' : '#1E293B'
      ctx.fillText(node.label, node.x, node.y + r + 4)
    }
    ctx.globalAlpha = 1
  }, [highlightedIds, selectedNode, isDark])

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    const r = getNodeRadius(node)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  const linkColor = useCallback((link) => {
    const src = link.source?.id || link.source
    const tgt = link.target?.id || link.target
    const dimmed = highlightedIds && !highlightedIds.has(src) && !highlightedIds.has(tgt)
    if (dimmed) return 'rgba(255,255,255,0.04)'
    return EDGE_COLORS[link.type] || '#6B7280'
  }, [highlightedIds])

  const linkWidth = useCallback((link) => 1 + (link.weight || 1) * 0.3, [])

  const nodeLabel = useCallback((node) => {
    const bg = isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)'
    const border = isDark ? 'rgba(51,65,85,0.6)' : 'rgba(203,213,225,0.8)'
    const titleColor = isDark ? '#ffffff' : '#0f172a'
    const subColor = isDark ? '#94a3b8' : '#64748b'
    return `
    <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:8px 12px;font-family:Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.25);">
      <div style="font-size:12px;font-weight:600;color:${titleColor};">${escapeHtml(node.label)}</div>
      <div style="font-size:10px;color:${subColor};text-transform:capitalize;">${escapeHtml(node.type)}</div>
      ${node.risk_score > 0 ? `<div style="font-size:10px;color:#dc2626;margin-top:2px;">Risk: ${escapeHtml(node.risk_score)}</div>` : ''}
    </div>
  `
  }, [isDark])

  const toggleFilter = (type) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  if (!graphData?.nodes) {
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant/60 dark:text-slate-500 text-sm">
        {t('workspace.noData')}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] bg-slate-100 dark:bg-[#0A0C14] rounded-xl overflow-hidden">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder={t('workspace.searchNodes') || 'Search nodes...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white/90 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700/50 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary/50 w-36 shadow-sm"
        />
        {Object.entries(filters).map(([type, active]) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
              active ? 'border-opacity-50' : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 bg-white/70 dark:bg-transparent'
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

      <div className="absolute top-3 right-3 z-10 text-[10px] text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/60 border border-slate-300/70 dark:border-transparent px-2 py-1 rounded-md shadow-sm">
        {searchMatchIds
          ? `${filteredData.nodes.length} / ${graphData.nodes.length} ${t('workspace.nodes') || 'nodes'} · ${filteredData.edges.length} ${t('workspace.edges') || 'edges'}`
          : `${graphData.nodes.length} ${t('workspace.nodes') || 'nodes'} · ${graphData.edges.length} ${t('workspace.edges') || 'edges'}`}
      </div>

      {searchMatchIds && filteredData.nodes.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700/50 rounded-lg px-4 py-2 shadow-lg">
            No nodes match &ldquo;{searchQuery.trim()}&rdquo;
          </div>
        </div>
      )}

      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphPayload}
        backgroundColor={isDark ? '#0A0C14' : '#F1F5F9'}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        nodeLabel={nodeLabel}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onEngineStop={handleEngineStop}
        cooldownTicks={100}
      />

      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-3 text-[10px] bg-white/90 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700/50 rounded-lg px-3 py-2 shadow-lg">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700/50 rounded-lg px-3 py-2 shadow-lg hidden sm:block">
        Click to select &middot; Drag nodes &middot; Scroll to zoom &middot; Drag background to pan
      </div>
    </div>
  )
}
