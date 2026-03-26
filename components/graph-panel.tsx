import React, { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import { Maximize2, Minimize2, Network, Locate, Globe, RefreshCw } from "lucide-react"

import { Note, Person, GNode, GEdge } from "@/lib/types"
import { buildGraph, tickSim } from "@/lib/graph"
import { NoteIcon } from "./note-icon"

// Invisible snap grid for tidy drag placement
const GRID = 20
function snapToGrid(v: number) { return Math.round(v / GRID) * GRID }

// Visual radius for note nodes — larger for hubs (3+ connections)
function noteVisualR(degree: number, isActive: boolean, isHov: boolean): number {
    const isHub = degree >= 3
    const base = isHub ? 8.5 : degree <= 1 ? 4.5 : 5.5
    if (isActive) return base + 3
    if (isHov) return base + 1.5
    return base
}

// Quadratic bezier path between two points with a gentle perpendicular curve
function bezierPath(sx: number, sy: number, tx: number, ty: number): string {
    const mx = (sx + tx) / 2
    const my = (sy + ty) / 2
    const dx = tx - sx, dy = ty - sy
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const curveAmt = Math.min(len * 0.12, 22)
    const cpx = mx + (-dy / len) * curveAmt
    const cpy = my + (dx / len) * curveAmt
    return `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`
}

export function GraphPanel({ notes, people, activeNoteId, onSelectNote, isExpanded, onToggleExpand }: {
    notes: Note[]; people: Person[]; activeNoteId: string | null; onSelectNote: (id: string) => void
    isExpanded: boolean; onToggleExpand: () => void
}) {
    const { resolvedTheme } = useTheme()
    const dark = resolvedTheme !== 'light'

    // Theme-aware color tokens
    const T = dark ? {
        bg: '#070709', dot: '#111118',
        cardFill: '#131929', cardActiveFill: '#0d1f38',
        cardBorder: '#1e2d45', cardActiveBorder: '#3b82f6',
        cardShadow: '#060c18', cardActiveShadow: '#1d3a6e',
        edgeDefault: '#1e2d3e', edgeHover: '#264460', edgeActive: '#3b82f6',
        tagFill: '#0f1520', tagActiveFill: '#0d1f38',
        tagBorder: '#1a2a40', tagActiveBorder: '#3b82f6',
        portDefault: '#1e2d45', portHover: '#3b82f6',
        textNote: '#7a94b8', textNoteActive: '#93c5fd', textNoteHover: '#a8bedc',
        textTag: '#4a6480', textTagActive: '#60a5fa', textTagHover: '#5a7a9a',
        tooltip: 'rgba(13,17,27,0.92)', tooltipBorder: 'rgba(59,130,246,0.25)', tooltipText: '#7a94b8',
        header: '#2a3f5a', ctrl: '#0f1520', ctrlBorder: '#1a2a40', ctrlText: '#2a3f5a',
        ctrlHoverText: '#3b82f6', ctrlHoverBorder: '#3b82f6',
        ctrlActiveText: '#93c5fd', ctrlActiveBg: '#0d1f38', ctrlActiveBorder: '#3b82f6',
        empty: '#1a2a40',
        nodeFill: '#253040', nodeHovFill: '#2e4060', nodeActiveFill: '#3b82f6',
        tagNodeFill: '#161f2e', tagNodeActiveFill: '#1a3565',
        hubGlow: 'rgba(59,130,246,0.12)',
    } : {
        bg: 'rgba(248,250,252,0.92)', dot: '#e2e8f0',
        cardFill: '#ffffff', cardActiveFill: '#eef2ff',
        cardBorder: '#e5e7eb', cardActiveBorder: '#6366f1',
        cardShadow: '#c7d2fe', cardActiveShadow: '#6366f1',
        edgeDefault: '#dde2ea', edgeHover: '#a5b4fc', edgeActive: '#6366f1',
        tagFill: '#f9fafb', tagActiveFill: '#eef2ff',
        tagBorder: '#e5e7eb', tagActiveBorder: '#a5b4fc',
        portDefault: '#e5e7eb', portHover: '#6366f1',
        textNote: '#7b8a9a', textNoteActive: '#2563eb', textNoteHover: '#4b6280',
        textTag: '#a0aab8', textTagActive: '#4f46e5', textTagHover: '#6366f1',
        tooltip: 'rgba(255,255,255,0.97)', tooltipBorder: '#e5e7eb', tooltipText: '#374151',
        header: '#9ca3af', ctrl: 'rgba(255,255,255,0.90)', ctrlBorder: '#e5e7eb', ctrlText: '#9ca3af',
        ctrlHoverText: '#6366f1', ctrlHoverBorder: '#a5b4fc',
        ctrlActiveText: '#4338ca', ctrlActiveBg: '#eef2ff', ctrlActiveBorder: '#a5b4fc',
        empty: '#d1d5db',
        nodeFill: '#bfc8d4', nodeHovFill: '#8fa0b4', nodeActiveFill: '#3b82f6',
        tagNodeFill: '#dde2ea', tagNodeActiveFill: '#a5b4fc',
        hubGlow: 'rgba(99,102,241,0.10)',
    }

    const containerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ w: 340, h: 500 })
    const sizeRef = useRef({ w: 340, h: 500 })
    const nodesRef = useRef<GNode[]>([])
    const edgesRef = useRef<GEdge[]>([])
    const [, forceRender] = useState(0)
    const rafRef = useRef<number>()
    const tickCountRef = useRef(0)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [hovered, setHovered] = useState<string | null>(null)
    const panRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0, lpx: 0, lpy: 0 })
    const dragRef = useRef<{ id: string; ox: number; oy: number; lpx: number; lpy: number; lvx: number; lvy: number } | null>(null)
    const panVRef = useRef({ vx: 0, vy: 0 })
    const afterThrowRef = useRef(0)

    const activeNoteIdRef = useRef(activeNoteId)
    useEffect(() => { activeNoteIdRef.current = activeNoteId }, [activeNoteId])

    const [localMode, setLocalMode] = useState(true)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const ro = new ResizeObserver(entries => {
            for (const e of entries) {
                const { width, height } = e.contentRect
                if (width > 0 && height > 0) {
                    sizeRef.current = { w: width, h: height }
                    tickCountRef.current = Math.max(0, tickCountRef.current - 50)
                    requestAnimationFrame(() => setSize({ w: width, h: height }))
                }
            }
        })
        ro.observe(el)
        const rect = el.getBoundingClientRect()
        if (rect.width > 0) {
            sizeRef.current = { w: rect.width, h: rect.height }
            setSize({ w: rect.width, h: rect.height })
        }
        return () => ro.disconnect()
    }, [])

    const graphKey = useMemo(
        () => notes.map(n => `${n.id}:${n.title}:${n.emoji}:${n.color}:${n.tags.join(',')}:${n.blocks.map(b => b.content + (b.expandedContent || '')).join('')}`).join('|') + '|p:' + people.map(p => p.id).join(','),
        [notes, people]
    )

    useEffect(() => {
        const existingMap = new Map(nodesRef.current.map(n => [n.id, n]))
        const { nodes, edges } = buildGraph(notes, people, sizeRef.current.w, sizeRef.current.h, existingMap)

        const activeNode = nodes.find(n => n.noteId === activeNoteIdRef.current)
        if (activeNode) {
            const neighborIds = new Set<string>()
            edges.forEach(e => {
                if (e.source === activeNode.id) neighborIds.add(e.target)
                if (e.target === activeNode.id) neighborIds.add(e.source)
            })
            nodes.forEach(node => {
                if (neighborIds.has(node.id) && !existingMap.has(node.id)) {
                    const angle = Math.random() * Math.PI * 2
                    node.x = activeNode.x + Math.cos(angle) * 30
                    node.y = activeNode.y + Math.sin(angle) * 30
                    node.vx = 0; node.vy = 0
                }
            })
        }

        nodesRef.current = nodes
        edgesRef.current = edges
        tickCountRef.current = 0
    }, [graphKey])

    useEffect(() => {
        function animate() {
            const tc = tickCountRef.current
            if (afterThrowRef.current > 0) afterThrowRef.current--
            const alpha = tc < 280
                ? Math.max(0.05, 1 - tc / 280)
                : dragRef.current ? 0.18
                : afterThrowRef.current > 0 ? 0.12
                : 0
            if (alpha > 0) {
                tickSim(nodesRef.current, edgesRef.current, size.w, size.h, alpha)
                tickCountRef.current++
                forceRender(k => k + 1)
            }
            const pv = panVRef.current
            if (!panRef.current.active && (Math.abs(pv.vx) > 0.25 || Math.abs(pv.vy) > 0.25)) {
                pv.vx *= 0.85
                pv.vy *= 0.85
                setPan(p => ({ x: p.x + pv.vx, y: p.y + pv.vy }))
            } else if (!panRef.current.active) {
                pv.vx = 0; pv.vy = 0
            }
            rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [size])

    useEffect(() => {
        if (!localMode) return
        const timeout = setTimeout(() => {
            const node = nodesRef.current.find(n => n.noteId === activeNoteId)
            if (!node) { setPan({ x: 0, y: 0 }); setZoom(1); return }
            setPan({
                x: sizeRef.current.w / 2 - node.x,
                y: sizeRef.current.h / 2 - node.y,
            })
            setZoom(1)
        }, 60)
        return () => clearTimeout(timeout)
    }, [localMode, activeNoteId])

    // Auto-layout: scatter nodes back to their initial ring positions and let sim re-converge
    const handleAutoLayout = useCallback(() => {
        const { w, h } = sizeRef.current
        const cx = w / 2, cy = h / 2
        const noteNodes = nodesRef.current.filter(n => n.type === 'note')
        const tagNodes = nodesRef.current.filter(n => n.type === 'tag')
        noteNodes.forEach((n, i) => {
            const a = (i / Math.max(noteNodes.length, 1)) * Math.PI * 2
            const r = Math.min(w, h) * 0.30
            n.x = cx + Math.cos(a) * r + (Math.random() - 0.5) * 50
            n.y = cy + Math.sin(a) * r + (Math.random() - 0.5) * 50
            n.vx = 0; n.vy = 0
        })
        tagNodes.forEach((n, i) => {
            const a = (i / Math.max(tagNodes.length, 1)) * Math.PI * 2
            const r = Math.min(w, h) * 0.12
            n.x = cx + Math.cos(a) * r + (Math.random() - 0.5) * 25
            n.y = cy + Math.sin(a) * r + (Math.random() - 0.5) * 25
            n.vx = 0; n.vy = 0
        })
        tickCountRef.current = 0  // restarts the simulation
    }, [])

    function toGraph(screenX: number, screenY: number) {
        const rect = containerRef.current!.getBoundingClientRect()
        return { x: (screenX - rect.left - pan.x) / zoom, y: (screenY - rect.top - pan.y) / zoom }
    }

    function nodeAt(sx: number, sy: number): GNode | null {
        const { x, y } = toGraph(sx, sy)
        for (const n of [...visibleNodes].reverse()) {
            const dx = n.x - x, dy = n.y - y
            if (Math.sqrt(dx * dx + dy * dy) < n.r + 4) return n
        }
        return null
    }

    function handlePointerDown(e: React.PointerEvent) {
        const node = nodeAt(e.clientX, e.clientY)
        e.currentTarget.setPointerCapture(e.pointerId)
        if (node) {
            const { x, y } = toGraph(e.clientX, e.clientY)
            dragRef.current = { id: node.id, ox: x - node.x, oy: y - node.y, lpx: x, lpy: y, lvx: 0, lvy: 0 }
        } else {
            panVRef.current = { vx: 0, vy: 0 }
            panRef.current = { active: true, sx: e.clientX, sy: e.clientY, spx: pan.x, spy: pan.y, lpx: e.clientX, lpy: e.clientY }
        }
    }

    function handlePointerMove(e: React.PointerEvent) {
        const drag = dragRef.current
        if (drag) {
            const { x, y } = toGraph(e.clientX, e.clientY)
            const node = nodesRef.current.find(n => n.id === drag.id)
            if (node) {
                node.x = x - drag.ox
                node.y = y - drag.oy
                drag.lvx = drag.lvx * 0.6 + (x - drag.lpx) * 0.4
                drag.lvy = drag.lvy * 0.6 + (y - drag.lpy) * 0.4
                drag.lpx = x; drag.lpy = y
                node.vx = 0; node.vy = 0
            }
        } else if (panRef.current.active) {
            const dx = e.clientX - panRef.current.lpx
            const dy = e.clientY - panRef.current.lpy
            panVRef.current.vx = panVRef.current.vx * 0.3 + dx * 0.7
            panVRef.current.vy = panVRef.current.vy * 0.3 + dy * 0.7
            panRef.current.lpx = e.clientX
            panRef.current.lpy = e.clientY
            setPan({ x: panRef.current.spx + e.clientX - panRef.current.sx, y: panRef.current.spy + e.clientY - panRef.current.sy })
        } else {
            setHovered(nodeAt(e.clientX, e.clientY)?.id || null)
        }
    }

    function handlePointerUp(e: React.PointerEvent) {
        const drag = dragRef.current
        if (drag) {
            const node = nodesRef.current.find(n => n.id === drag.id)
            const { x, y } = toGraph(e.clientX, e.clientY)
            const moved = node ? Math.abs((x - drag.ox) - node.x) + Math.abs((y - drag.oy) - node.y) : 999
            if (moved < 8 && node?.type === 'note' && node.noteId) onSelectNote(node.noteId)
            if (node) {
                // Snap to invisible grid after drag
                node.x = snapToGrid(node.x)
                node.y = snapToGrid(node.y)
                // Throw velocity
                node.vx = drag.lvx * 4
                node.vy = drag.lvy * 4
                afterThrowRef.current = 60
            }
            dragRef.current = null
        }
        panRef.current.active = false
    }

    function handleWheel(e: React.WheelEvent) {
        e.preventDefault()
        setZoom(z => Math.max(0.25, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))))
    }

    const allNodes = nodesRef.current
    const allEdges = edgesRef.current
    const nodeMap = new Map(allNodes.map(n => [n.id, n]))

    let visibleNodes: GNode[]
    let visibleEdges: GEdge[]

    if (localMode && activeNoteId) {
        const activeNode = allNodes.find(n => n.noteId === activeNoteId)
        if (activeNode) {
            const visibleIds = new Set<string>([activeNode.id])
            allEdges.forEach(e => {
                if (e.source === activeNode.id) visibleIds.add(e.target)
                if (e.target === activeNode.id) visibleIds.add(e.source)
            })
            visibleIds.forEach(id => {
                if (nodeMap.get(id)?.type === 'tag') {
                    allEdges.forEach(e => {
                        if (e.source === id) visibleIds.add(e.target)
                        if (e.target === id) visibleIds.add(e.source)
                    })
                }
            })
            visibleNodes = allNodes.filter(n => visibleIds.has(n.id))
            visibleEdges = allEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
        } else {
            visibleNodes = []
            visibleEdges = []
        }
    } else {
        visibleNodes = allNodes
        visibleEdges = allEdges
    }

    const hoveredNode = visibleNodes.find(n => n.id === hovered)

    const activeHasConnections = localMode
        ? (allEdges.some(e => {
            const an = allNodes.find(n => n.noteId === activeNoteId)
            return an && (e.source === an.id || e.target === an.id)
        }))
        : allNodes.length > 0

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden select-none"
            style={{ background: T.bg, cursor: hovered ? 'pointer' : dragRef.current ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => { setHovered(null); panRef.current.active = false }}
            onWheel={handleWheel}
        >
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                    <pattern id="g-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="0.85" fill={T.dot} />
                    </pattern>
                    <filter id="f-eglow" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="f-node-glow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="f-hub-glow" x="-120%" y="-120%" width="340%" height="340%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <rect width="100%" height="100%" fill={T.bg} />
                <rect width="100%" height="100%" fill="url(#g-dots)" />

                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                    {/* ── Edges (bezier curves) ── */}
                    {visibleEdges.map((edge, i) => {
                        const s = nodeMap.get(edge.source), t = nodeMap.get(edge.target)
                        if (!s || !t) return null
                        const isActive = s.noteId === activeNoteId || t.noteId === activeNoteId
                        const isHov = s.id === hovered || t.id === hovered
                        const isTagEdge = s.type === 'tag' || t.type === 'tag'
                        const path = bezierPath(s.x, s.y, t.x, t.y)

                        if (isActive) return (
                            <g key={i}>
                                {/* Glow layer */}
                                <path d={path} fill="none"
                                    stroke={T.edgeActive} strokeWidth={3} strokeOpacity={0.14}
                                    filter="url(#f-eglow)"
                                    strokeDasharray={isTagEdge ? '4 3' : undefined} />
                                {/* Solid layer */}
                                <path d={path} fill="none"
                                    stroke={T.edgeActive} strokeWidth={1.25} strokeOpacity={0.85}
                                    strokeDasharray={isTagEdge ? '4 3' : undefined} />
                            </g>
                        )
                        return (
                            <path key={i} d={path} fill="none"
                                stroke={isHov ? T.edgeHover : T.edgeDefault}
                                strokeWidth={isHov ? 1.25 : 0.85}
                                strokeOpacity={isHov ? 1.0 : 0.4}
                                strokeDasharray={isTagEdge ? '4 3' : undefined}
                            />
                        )
                    })}

                    {/* ── Tag nodes (pill shape) ── */}
                    {visibleNodes.filter(n => n.type === 'tag').map(node => {
                        const isHov = node.id === hovered
                        const connectedNotes = visibleEdges
                            .filter(e => e.target === node.id || e.source === node.id)
                            .map(e => e.source === node.id ? e.target : e.source)
                        const isActive = connectedNotes.some(nid => nodeMap.get(nid)?.noteId === activeNoteId)
                        const label = node.label.length > 10 ? node.label.slice(0, 10) + '…' : node.label
                        const pillW = Math.max(label.length * 5.2 + 16, 28)
                        const pillH = 13

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                <rect
                                    x={-pillW / 2} y={-pillH / 2}
                                    width={pillW} height={pillH}
                                    rx={pillH / 2}
                                    fill={isActive ? T.tagNodeActiveFill : isHov ? T.nodeHovFill : T.tagNodeFill}
                                    stroke={isActive ? T.tagActiveBorder : T.tagBorder}
                                    strokeWidth={isHov ? 1.25 : 0.75}
                                    opacity={isHov ? 1 : 0.9}
                                />
                                <text
                                    y={4} textAnchor="middle" fontSize={7.5}
                                    fill={isActive ? T.textTagActive : isHov ? T.textTagHover : T.textTag}
                                    fontWeight={isActive ? '600' : '400'}
                                    style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}
                                >
                                    #{label}
                                </text>
                            </g>
                        )
                    })}

                    {/* ── Note nodes (degree-aware dots) ── */}
                    {visibleNodes.filter(n => n.type === 'note').map(node => {
                        const isActive = node.noteId === activeNoteId
                        const isHov = node.id === hovered
                        const degree = node.degree ?? 0
                        const isHub = degree >= 3
                        const dotR = noteVisualR(degree, isActive, isHov)
                        const fill = isActive ? T.nodeActiveFill : isHov ? T.nodeHovFill : T.nodeFill

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}
                                style={{ zIndex: isHub ? 2 : 1 }}>
                                {/* Hub ambient glow */}
                                {isHub && !isActive && (
                                    <circle r={dotR + 9} fill={T.hubGlow} filter="url(#f-hub-glow)" />
                                )}
                                {/* Active node glow */}
                                {isActive && (
                                    <circle r={dotR + 7} fill={T.nodeActiveFill} opacity={0.18}
                                        filter="url(#f-node-glow)" />
                                )}
                                <circle r={dotR} fill={fill} />
                                {/* Hub ring indicator */}
                                {isHub && !isActive && (
                                    <circle r={dotR + 2.5} fill="none"
                                        stroke={dark ? '#2a3f5a' : '#c7d2fe'}
                                        strokeWidth={0.75} opacity={0.6} />
                                )}
                                {/* Inner highlight for active */}
                                {isActive && (
                                    <circle r={3} fill="white" opacity={0.3} cy={-2} />
                                )}
                                <text
                                    y={dotR + 11}
                                    textAnchor="middle"
                                    fontSize={isHub ? 10 : 9}
                                    fill={isActive ? T.textNoteActive : isHov ? T.textNoteHover : T.textNote}
                                    fontWeight={isHub || isActive ? '600' : '500'}
                                    style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}
                                >
                                    {node.label.length > 14 ? node.label.slice(0, 14) + '…' : node.label}
                                </text>
                            </g>
                        )
                    })}
                </g>
            </svg>

            {/* ── Hover tooltip ── */}
            {hoveredNode && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 10 }}>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm"
                        style={{ background: T.tooltip, border: `1px solid ${T.tooltipBorder}`, color: T.tooltipText, backdropFilter: 'blur(8px)', fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>
                        {hoveredNode.type === 'note' && <NoteIcon iconName={hoveredNode.emoji} className="w-3.5 h-3.5 opacity-80" />}
                        <span>{hoveredNode.type === 'tag' ? `#${hoveredNode.label}` : hoveredNode.label}</span>
                        {(hoveredNode.degree ?? 0) >= 3 && <span style={{ color: T.textTag, fontSize: 9 }}>{hoveredNode.degree} links</span>}
                    </div>
                </div>
            )}

            {/* ── Header: title + local/all toggle + expand ── */}
            <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[9px] font-semibold tracking-[.16em] uppercase"
                        style={{ color: T.header, fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>Graph</span>
                </div>
                <div className="flex items-center gap-1 pointer-events-auto">
                    {/* Auto-layout */}
                    <button
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                        style={{ background: T.ctrl, border: `1px solid ${T.ctrlBorder}`, color: T.ctrlText }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.color = T.ctrlHoverText; el.style.borderColor = T.ctrlHoverBorder }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.color = T.ctrlText; el.style.borderColor = T.ctrlBorder }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={handleAutoLayout}
                        title="Auto-layout nodes"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    {/* Local / All toggle */}
                    <button
                        className="flex items-center gap-1 h-6 px-2 rounded-md text-[9px] font-semibold tracking-wider uppercase transition-all"
                        style={{
                            background: localMode ? T.ctrlActiveBg : T.ctrl,
                            border: `1px solid ${localMode ? T.ctrlActiveBorder : T.ctrlBorder}`,
                            color: localMode ? T.ctrlActiveText : T.ctrlText,
                            fontFamily: 'ui-sans-serif,system-ui,sans-serif',
                        }}
                        onMouseEnter={e => {
                            if (!localMode) {
                                e.currentTarget.style.color = T.ctrlHoverText
                                e.currentTarget.style.borderColor = T.ctrlHoverBorder
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = localMode ? T.ctrlActiveText : T.ctrlText
                            e.currentTarget.style.borderColor = localMode ? T.ctrlActiveBorder : T.ctrlBorder
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => setLocalMode(m => !m)}
                        title={localMode ? 'Show all pages in graph' : 'Focus on current page only'}
                    >
                        {localMode
                            ? <><Locate className="w-2.5 h-2.5" />Local</>
                            : <><Globe className="w-2.5 h-2.5" />All</>
                        }
                    </button>
                    {/* Expand / minimize */}
                    <button
                        className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                        style={{ background: T.ctrl, border: `1px solid ${T.ctrlBorder}`, color: T.ctrlText }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.color = T.ctrlHoverText; el.style.borderColor = T.ctrlHoverBorder }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.color = T.ctrlText; el.style.borderColor = T.ctrlBorder }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={onToggleExpand}
                        title={isExpanded ? 'Reduce graph' : 'Expand graph'}
                    >
                        {isExpanded
                            ? <Minimize2 className="w-3 h-3" />
                            : <Maximize2 className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* ── Zoom controls ── */}
            <div className="absolute bottom-4 right-3.5 flex flex-col gap-1">
                {([
                    { label: '+', fn: () => setZoom(z => Math.min(4, z * 1.25)) },
                    { label: '−', fn: () => setZoom(z => Math.max(0.25, z * 0.8)) },
                    { label: '⌂', fn: () => { setPan({ x: 0, y: 0 }); setZoom(1) } },
                ] as { label: string; fn: () => void }[]).map(({ label, fn }) => (
                    <button key={label}
                        className="w-6 h-6 rounded-md text-xs flex items-center justify-center transition-all shadow-sm"
                        style={{ background: T.ctrl, border: `1px solid ${T.ctrlBorder}`, color: T.ctrlText }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.color = T.ctrlHoverText; el.style.borderColor = T.ctrlHoverBorder }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.color = T.ctrlText; el.style.borderColor = T.ctrlBorder }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={fn}
                    >{label}</button>
                ))}
            </div>

            {/* ── Empty state ── */}
            {visibleNodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <Network className="w-7 h-7" style={{ color: T.empty }} />
                    <span className="text-[10px] font-medium tracking-widest uppercase text-center px-6"
                        style={{ color: T.empty, fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>
                        {localMode
                            ? 'No connections on this page'
                            : 'Add tags to see connections'}
                    </span>
                    {localMode && (
                        <button
                            className="pointer-events-auto mt-1 flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-semibold tracking-wider uppercase transition-all"
                            style={{
                                background: T.ctrl,
                                border: `1px solid ${T.ctrlBorder}`,
                                color: T.ctrlText,
                                fontFamily: 'ui-sans-serif,system-ui,sans-serif',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = T.ctrlHoverText; e.currentTarget.style.borderColor = T.ctrlHoverBorder }}
                            onMouseLeave={e => { e.currentTarget.style.color = T.ctrlText; e.currentTarget.style.borderColor = T.ctrlBorder }}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => setLocalMode(false)}
                        >
                            <Globe className="w-2.5 h-2.5" />
                            View all pages
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
