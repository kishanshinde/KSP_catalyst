import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useTheme } from '../../../contexts/ThemeContext'

// FIR's original yellow (#EAB308) and Location's green (#22C55E) fail
// colorblind separation (validate_palette.js: protan ΔE 4.2, well under the
// ΔE 8 safety floor) — this amber clears every check against the rest of
// the set in both themes without touching the other four established hues.
const TYPE_COLORS = {
  central: '#FFFFFF',
  accused: '#EF4444',
  victim: '#3B82F6',
  fir: '#BF7107',
  location: '#22C55E',
  mo: '#A855F7',
}

// The central (searched) node's fixed white fill is invisible against the
// graph's light-theme background (#F1F5F9, nearly the same tone) — flip it
// to a dark slate there instead of leaving it a plain palette lookup.
// Hub nodes (see HUB_DEFS below) are a neutral slate, deliberately outside
// the five case-data hues, so they read as "this is a grouping" rather than
// another category of real record.
function getNodeColor(node, isDark) {
  if (node.type === 'central') return isDark ? '#FFFFFF' : '#1E293B'
  if (node.type === 'hub') return isDark ? '#94A3B8' : '#64748B'
  return TYPE_COLORS[node.type] || '#6B7280'
}

// Plain `type.charAt(0).toUpperCase() + type.slice(1)` turns 'fir' into 'Fir'
// and 'mo' into 'Mo' — both are abbreviations (First Information Report,
// Modus Operandi) that read as garbled words at that casing.
const TYPE_LABELS = {
  central: 'Central',
  accused: 'Accused',
  victim: 'Victim',
  fir: 'FIR',
  location: 'Location',
  mo: 'MO',
}

// Full expansions for the two abbreviations, shown as a hover tooltip so the
// compact pill/legend labels above don't have to spell them out inline.
const TYPE_TITLES = {
  fir: 'First Information Report',
  mo: 'Modus Operandi',
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

// Relationship type is hard to read from hue alone at 1-2px line widths, so
// derived/inferred edges (computed from shared FIRs or shared cities, not a
// direct record relationship) get a dash pattern as a second, color-independent cue.
const DASHED_EDGE_TYPES = new Set(['CO_ACCUSED', 'SHARED_LOCATION'])
const DASH_PATTERN = [5, 3]

const COMMUNITY_COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7',
  '#F97316', '#EC4899', '#06B6D4', '#8B5CF6', '#10B981',
]

const NO_HALO_TYPES = new Set(['location', 'mo', 'fir', 'hub'])

// Edge types the search BFS below won't traverse THROUGH — mirrors the
// backend's own bfsReachable (criminal-network-analysis/index.js) so a name
// search here behaves the same as the page-level server search. CO_ACCUSED
// and SHARED_LOCATION are broad, derived relationships that would otherwise
// let the walk balloon into unrelated people's unrelated FIRs; the nodes on
// the other end still show up (reached via a shared FIR instead) and the
// edge itself still renders once both endpoints are in view.
const BFS_SKIP_EDGE_TYPES = new Set(['CO_ACCUSED', 'SHARED_LOCATION'])

// A single-hop neighbor lookup missed everything past the immediate
// relationship — searching a person surfaced their FIR but not the victims,
// locations, or MOs on that FIR, two hops out. Walk out `maxDepth` hops from
// every matched node instead, same as the server does for the paged search.
function bfsReachable(startIds, edges, maxDepth) {
  const adj = new Map()
  for (const e of edges) {
    if (BFS_SKIP_EDGE_TYPES.has(e.type)) continue
    const src = e.source?.id || e.source
    const tgt = e.target?.id || e.target
    if (!adj.has(src)) adj.set(src, [])
    if (!adj.has(tgt)) adj.set(tgt, [])
    adj.get(src).push(tgt)
    adj.get(tgt).push(src)
  }

  const visited = new Map()
  const queue = []
  for (const id of startIds) {
    visited.set(id, 0)
    queue.push(id)
  }
  while (queue.length > 0) {
    const current = queue.shift()
    const depth = visited.get(current)
    if (depth >= maxDepth) continue
    for (const neighbor of (adj.get(current) || [])) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, depth + 1)
        queue.push(neighbor)
      }
    }
  }
  return new Set(visited.keys())
}

// Compass layout around the central/searched node's hub nodes (see
// HUB_DEFS below): co-accused sharing a FIR with the center above, the FIRs
// themselves to the left, locations to the right, the broader co-accused /
// shared-location network below, and victims/MOs on diagonals (no slot for
// them in the reference layout, but they're real fetched data and stay
// visible rather than being dropped).
const CATEGORY_ANGLES = {
  accused: -Math.PI / 2, // up
  fir: Math.PI, // left
  location: 0, // right
  associate: Math.PI / 2, // down
  mo: -Math.PI / 4, // up-right diagonal
  victim: Math.PI / 4, // down-right diagonal
}

// Which real node types roll into which hub, relative to the center. Same
// node TYPE can land in different hubs: an accused sharing a FIR with the
// center is formally co-accused ('accused'); one reachable only via a
// direct co-accused/shared-location edge is a looser network tie
// ('associate'). Victims get their own hub — they're a distinct role from
// either kind of accused, not a network association.
const HUB_DEFS = {
  accused: { label: 'Co-Accused' },
  fir: { label: 'FIR' },
  location: { label: 'Locations' },
  associate: { label: 'Associates' },
  mo: { label: 'MO' },
  victim: { label: 'Victim' },
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

// A custom d3-force: keeps each hub node within a wedge centered on its
// category's compass angle. Only hubs get this treatment — with the real
// leaf entities attached to their hub rather than to the center directly
// (see groupedData below), there are only ever a handful of hubs to
// position, so a wedge-per-hub reliably resolves instead of fighting over
// exact rays the way one-per-entity did. Leaves then fan out around their
// already-positioned hub via the ordinary charge/link forces. Six
// categories means some neighbors sit only 45° apart (e.g. MO at -45°
// between Co-Accused at -90° and Locations at 0°) — the wedge has to stay
// under half that spacing per side or adjacent hubs fight over the same
// band instead of both settling into their own slot.
function makeRadialCategoryForce(centerIds) {
  let nodes = []
  const STRENGTH = 3
  const HALF_WEDGE = Math.PI / 9 // 20° each side of center angle
  function force(alpha) {
    if (centerIds.size === 0) return
    let cx = 0, cy = 0, count = 0
    for (const n of nodes) {
      if (centerIds.has(n.id) && Number.isFinite(n.x)) {
        cx += n.x
        cy += n.y
        count++
      }
    }
    if (count === 0) return
    cx /= count
    cy /= count
    for (const n of nodes) {
      if (n.type !== 'hub' || !Number.isFinite(n.x)) continue
      const target = CATEGORY_ANGLES[n.category]
      if (target == null) continue
      const relX = n.x - cx
      const relY = n.y - cy
      const dist = Math.hypot(relX, relY) || 1

      if (dist < 40) {
        n.vx += Math.cos(target) * alpha * STRENGTH
        n.vy += Math.sin(target) * alpha * STRENGTH
        continue
      }

      const diff = normalizeAngle(Math.atan2(relY, relX) - target)
      if (Math.abs(diff) <= HALF_WEDGE) continue
      const rotateSign = diff > 0 ? -1 : 1
      const tangentX = (-relY / dist) * rotateSign
      const tangentY = (relX / dist) * rotateSign
      n.vx += tangentX * alpha * STRENGTH
      n.vy += tangentY * alpha * STRENGTH
    }
  }
  force.initialize = (_nodes) => { nodes = _nodes }
  return force
}

function getNodeRadius(node) {
  const base = { central: 30, accused: 14, victim: 10, fir: 12, location: 9, mo: 7, hub: 16 }
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

    // With an active search, show matched nodes plus their reachable
    // subgraph (FIRs, and the victims/locations/MOs two hops out through
    // those FIRs) instead of collapsing down to isolated text matches or
    // stopping one hop short of the full picture.
    if (searchMatchIds) {
      if (searchMatchIds.size === 0) return { nodes: [], edges: [] }
      const relatedIds = bfsReachable(searchMatchIds, graphData.edges, 2)
      const visibleNodes = graphData.nodes.filter((n) => relatedIds.has(n.id) && typeVisible(n))
      const visibleIds = new Set(visibleNodes.map((n) => n.id))
      const visibleEdges = graphData.edges.filter((e) =>
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

  // Whichever node(s) are "central" right now — either a server-marked
  // `type: 'central'` node (the page-level search) or the client-side
  // search match(es). Everything about the compass/hub layout below hangs
  // off this: with no center, there's nothing to group around.
  const centerIds = useMemo(() => {
    const ids = new Set()
    for (const n of filteredData.nodes) if (n.type === 'central') ids.add(n.id)
    if (ids.size === 0 && searchMatchIds) {
      const nodeIds = new Set(filteredData.nodes.map((n) => n.id))
      for (const id of searchMatchIds) if (nodeIds.has(id)) ids.add(id)
    }
    return ids
  }, [filteredData, searchMatchIds])

  // Rebuilds the tree the user asked for: center → category hub → real
  // entity, instead of center connected straight to every entity. The hub
  // nodes are a display-only grouping layer (not a datastore row — flagged
  // via `type: 'hub'`, styled in a neutral grey, never counted in the
  // node/edge totals shown in the corner); every leaf under one is still a
  // real fetched node with its real id, and the original edges are just
  // reorganized under a hub, not fabricated. Accused sharing a FIR with the
  // center land under the 'accused' hub (labeled "Co-Accused" — they're
  // formal co-defendants); accused reachable only via a direct
  // co-accused/shared-location edge land under 'associate' instead — same
  // node type, different hub, based on how they actually relate to the
  // center. Victims and MOs each get their own hub. With no clear center,
  // this is a no-op — just the flat real graph.
  const groupedData = useMemo(() => {
    const nodes = filteredData.nodes
    const edges = filteredData.edges
    if (nodes.length === 0 || centerIds.size === 0) return filteredData

    const nodesById = new Map(nodes.map((n) => [n.id, n]))
    const firIdsFromCenter = new Set()
    for (const e of edges) {
      const src = e.source?.id || e.source
      const tgt = e.target?.id || e.target
      const otherId = centerIds.has(src) ? tgt : (centerIds.has(tgt) ? src : null)
      if (otherId && nodesById.get(otherId)?.type === 'fir') firIdsFromCenter.add(otherId)
    }
    const accusedViaFir = new Set()
    for (const e of edges) {
      if (e.type !== 'ACCUSED_OF') continue
      const src = e.source?.id || e.source
      const tgt = e.target?.id || e.target
      if (firIdsFromCenter.has(src)) accusedViaFir.add(tgt)
      if (firIdsFromCenter.has(tgt)) accusedViaFir.add(src)
    }
    const categoryOf = (n) => {
      if (n.type === 'fir') return 'fir'
      if (n.type === 'location') return 'location'
      if (n.type === 'mo') return 'mo'
      if (n.type === 'accused') return accusedViaFir.has(n.id) ? 'accused' : 'associate'
      if (n.type === 'victim') return 'victim'
      return null
    }

    const groupedNodes = nodes.filter((n) => centerIds.has(n.id))
    const groupedEdges = []
    const hubsByCategory = new Map()

    for (const n of nodes) {
      if (centerIds.has(n.id)) continue
      const category = categoryOf(n)
      if (!category) {
        groupedNodes.push(n) // unrecognized type — keep it visible, just unattached
        continue
      }
      let hub = hubsByCategory.get(category)
      if (!hub) {
        hub = { id: `hub:${category}`, label: HUB_DEFS[category].label, type: 'hub', category }
        hubsByCategory.set(category, hub)
        groupedNodes.push(hub)
        for (const centerId of centerIds) {
          groupedEdges.push({ source: centerId, target: hub.id, type: 'HUB_LINK' })
        }
      }
      groupedNodes.push(n)
      groupedEdges.push({ source: hub.id, target: n.id, type: 'LEAF_LINK' })
    }

    return { nodes: groupedNodes, edges: groupedEdges }
  }, [filteredData, centerIds])

  // react-force-graph mutates node/link objects in place (adds x/y/vx/vy, and
  // resolves link.source/target from ids to node refs) — clone per grouped
  // set so switching filters/search doesn't feed it stale mutated objects.
  const graphPayload = useMemo(() => ({
    nodes: groupedData.nodes.map((n) => ({ ...n, isSearchMatch: searchMatchIds?.has(n.id) || false })),
    links: groupedData.edges.map((e) => ({ ...e })),
  }), [groupedData, searchMatchIds])

  const highlightedIds = useMemo(() => {
    if (!selectedNode) return null
    const ids = new Set([selectedNode.id])
    for (const e of groupedData.edges) {
      const src = e.source?.id || e.source
      const tgt = e.target?.id || e.target
      if (src === selectedNode.id) ids.add(tgt)
      if (tgt === selectedNode.id) ids.add(src)
    }
    return ids
  }, [selectedNode, groupedData])

  useEffect(() => {
    setSelectedNode(null)
  }, [graphData])

  // Default charge/link-distance is too weak once there are hundreds of
  // nodes in a small container — everything clumps into an unreadable ball.
  // Hub links get their own shorter distance than leaf links so a hub
  // doesn't collide with its own children (a leaf's distance-90 pull toward
  // its hub previously landed it about as far from the hub as the hub sat
  // from the center, overlapping the two).
  useEffect(() => {
    const chargeForce = graphRef.current?.d3Force('charge')
    if (chargeForce) chargeForce.strength(-160)
    const linkForce = graphRef.current?.d3Force('link')
    if (linkForce) {
      linkForce.distance((link) => {
        if (link.type === 'HUB_LINK') return 80
        if (link.type === 'LEAF_LINK') return 55
        return 90
      })
    }
  }, [])

  // Re-registered whenever the center changes (new search, new data) so the
  // compass layout tracks whichever node is currently "central". The
  // effect below runs in the same commit as ForceGraph2D's own
  // graphData-change restart, before any simulation ticks actually fire, so
  // the new force is in place for the whole cooldown run without an
  // explicit reheat.
  useEffect(() => {
    if (!graphRef.current?.d3Force) return
    graphRef.current.d3Force('radial-category', makeRadialCategoryForce(centerIds))
  }, [centerIds])

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
    // Fixed 60px padding overflowed small, high-risk-heavy result sets — a
    // central node alone can render at ~30px radius + an 8px halo ring, and
    // risk-scaled accused nodes aren't far behind. Scale padding to the
    // largest node actually in view instead of guessing a constant.
    const maxRadius = Math.max(...graphPayload.nodes.map(getNodeRadius), 10)
    // Padding reserves room beyond node bounding-box edges for halo rings
    // and the label drawn below each node — a plain radius-sized margin
    // still let labels clip the container edge.
    const padding = maxRadius * 2 + 30
    const filterFn = hasConnected ? (node) => (degree.get(node.id) || 0) > 0 : undefined
    graphRef.current.zoomToFit(400, padding, filterFn)

    // zoomToFit maximizes zoom to fill the container based on how tightly
    // clustered the nodes are — for a handful of nodes (a focused name
    // search is typically 5-10) that pulls the zoom in far enough that
    // fixed-radius circles render oversized and overflow. Node radius is
    // fixed in graph-space, so it scales with zoom same as everything else;
    // cap how far in the auto-fit is allowed to go.
    const MAX_ZOOM = 1.0
    setTimeout(() => {
      if (graphRef.current && graphRef.current.zoom() > MAX_ZOOM) {
        graphRef.current.zoom(MAX_ZOOM, 300)
      }
    }, 420)
  }, [graphPayload])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    // Freshly-added nodes have no x/y until the force simulation ticks once —
    // skip drawing them that frame rather than feeding NaN into canvas calls.
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return

    const dimmed = highlightedIds && !highlightedIds.has(node.id)
    const r = getNodeRadius(node)
    const color = getNodeColor(node, isDark)

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
    const showLabel = globalScale > 0.85 || node.type === 'central' || selectedNode?.id === node.id || node.isSearchMatch
    if (showLabel) {
      const fontSize = (node.type === 'central' ? 15 : 12.5) / globalScale
      ctx.font = `${node.type === 'central' ? 'bold ' : '600 '}${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const labelAlpha = dimmed ? 0.15 : 0.95

      // A text-colored pill behind the label keeps it legible regardless of
      // what's underneath — node halos, overlapping edges, other labels —
      // instead of relying on the canvas background alone for contrast.
      const textY = node.y + r + 4
      const metrics = ctx.measureText(node.label)
      const padX = 4 / globalScale
      const padY = 2 / globalScale
      ctx.globalAlpha = dimmed ? 0.08 : (isDark ? 0.72 : 0.85)
      ctx.fillStyle = isDark ? '#0A0C14' : '#F1F5F9'
      const radius = 3 / globalScale
      const rectX = node.x - metrics.width / 2 - padX
      const rectY = textY - padY
      const rectW = metrics.width + padX * 2
      const rectH = fontSize + padY * 2
      ctx.beginPath()
      ctx.roundRect(rectX, rectY, rectW, rectH, radius)
      ctx.fill()

      ctx.globalAlpha = labelAlpha
      ctx.fillStyle = isDark ? '#E2E8F0' : '#1E293B'
      ctx.fillText(node.label, node.x, textY)
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

  const linkWidth = useCallback((link) => 1.5 + (link.weight || 1) * 0.35, [])

  const linkLineDash = useCallback((link) => (DASHED_EDGE_TYPES.has(link.type) ? DASH_PATTERN : null), [])

  const nodeLabel = useCallback((node) => {
    const bg = isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)'
    const border = isDark ? 'rgba(51,65,85,0.6)' : 'rgba(203,213,225,0.8)'
    const titleColor = isDark ? '#ffffff' : '#0f172a'
    const subColor = isDark ? '#94a3b8' : '#64748b'
    return `
    <div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:8px 12px;font-family:Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.25);">
      <div style="font-size:12px;font-weight:600;color:${titleColor};">${escapeHtml(node.label)}</div>
      <div style="font-size:10px;color:${subColor};">${escapeHtml(node.type === 'hub' ? 'Group (not a record)' : (TYPE_LABELS[node.type] || node.type))}</div>
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
          autoComplete="off"
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
            title={TYPE_TITLES[type]}
          >
            {TYPE_LABELS[type] || type}
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
        linkLineDash={linkLineDash}
        linkDirectionalArrowLength={7}
        linkDirectionalArrowRelPos={1}
        linkDirectionalArrowColor={linkColor}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onEngineStop={handleEngineStop}
        cooldownTicks={100}
      />

      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-3 text-[10px] bg-white/90 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700/50 rounded-lg px-3 py-2 shadow-lg">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300" title={TYPE_TITLES[type]}>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-400/40"
              style={{ backgroundColor: type === 'central' ? (isDark ? '#FFFFFF' : '#1E293B') : color }}
            />
            {TYPE_LABELS[type] || type}
          </span>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700/50 rounded-lg px-3 py-2 shadow-lg hidden sm:block">
        Click to select &middot; Drag nodes &middot; Scroll to zoom &middot; Drag background to pan
      </div>
    </div>
  )
}
