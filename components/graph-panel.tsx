import React, { useRef, useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { Maximize2, Minimize2, Network, Locate, Globe } from "lucide-react"

import { Note, Person, GNode, GEdge } from "@/lib/types"
import { buildGraph, tickSim } from "@/lib/graph"
import { NoteIcon } from "./note-icon"

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
        // dot-node specific
        nodeFill: '#253040', nodeHovFill: '#2e4060', nodeActiveFill: '#3b82f6',
        tagNodeFill: '#161f2e', tagNodeActiveFill: '#1a3565',
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
        // dot-node specific
        nodeFill: '#bfc8d4', nodeHovFill: '#8fa0b4', nodeActiveFill: '#3b82f6',
        tagNodeFill: '#dde2ea', tagNodeActiveFill: '#a5b4fc',
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
    const panVRef = useRef({ vx: 0, vy: 0 })    // pan inertia velocity (screen px/frame)
    const afterThrowRef = useRef(0)              // ticks remaining for post-drag sim

    // Keep a ref so the graphKey effect can read the current active note
    // without becoming a dependency (which would rebuild the graph on every
    // note-switch, discarding all settled positions).
    const activeNoteIdRef = useRef(activeNoteId)
    useEffect(() => { activeNoteIdRef.current = activeNoteId }, [activeNoteId])

    // ── Local / global mode ────────────────────────────────────────────────
    // Default: focus on the current page's connections only.
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

        // New nodes that are direct neighbours of the active note should start
        // near it (not at a random graph-centre position) so they appear
        // in-viewport immediately rather than animating in from off-screen.
        const activeNode = nodes.find(n => n.noteId === activeNoteIdRef.current)
        if (activeNode) {
            const neighborIds = new Set<string>()
            edges.forEach(e => {
                if (e.source === activeNode.id) neighborIds.add(e.target)
                if (e.target === activeNode.id) neighborIds.add(e.source)
            })
            nodes.forEach(node => {
                if (neighborIds.has(node.id) && !existingMap.has(node.id)) {
                    // Brand-new neighbour — spawn it close to the active note
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
            // Decrement afterThrow counter (post-release sim window)
            if (afterThrowRef.current > 0) afterThrowRef.current--
            const alpha = tc < 280
                ? Math.max(0.05, 1 - tc / 280)
                : dragRef.current ? 0.18          // higher alpha so neighbours react during drag
                : afterThrowRef.current > 0 ? 0.12 // post-release throw sim
                : 0
            if (alpha > 0) {
                tickSim(nodesRef.current, edgesRef.current, size.w, size.h, alpha)
                tickCountRef.current++
                forceRender(k => k + 1)
            }
            // Pan inertia — coast to a stop after pointer release
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

    // Auto-center on the active note when entering local mode
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
            panVRef.current = { vx: 0, vy: 0 }  // cancel any ongoing inertia
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
                // Track smoothed velocity so we can throw on release
                drag.lvx = drag.lvx * 0.6 + (x - drag.lpx) * 0.4
                drag.lvy = drag.lvy * 0.6 + (y - drag.lpy) * 0.4
                drag.lpx = x; drag.lpy = y
                node.vx = 0; node.vy = 0  // prevent sim drift while dragging
            }
        } else if (panRef.current.active) {
            // Track pan velocity for inertia
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
                // Throw! Apply the smoothed drag velocity so the node coasts on release
                node.vx = drag.lvx * 4
                node.vy = drag.lvy * 4
                afterThrowRef.current = 60  // keep sim alive for ~1 s to let it play out
            }
            dragRef.current = null
        }
        panRef.current.active = false
        // panVRef retains its velocity — the RAF loop handles inertia decay
    }

    function handleWheel(e: React.WheelEvent) {
        e.preventDefault()
        setZoom(z => Math.max(0.25, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))))
    }

    const allNodes = nodesRef.current
    const allEdges = edgesRef.current
    const nodeMap = new Map(allNodes.map(n => [n.id, n]))

    // ── Local mode filter ────────────────────────────────────────────────────
    // Show the active note + all its direct neighbours (tags, @mention notes).
    // Then expand through every tag neighbour to include sibling notes that
    // share the same tag — so two pages with the same tag both appear,
    // connected via that shared tag node.
    let visibleNodes: GNode[]
    let visibleEdges: GEdge[]

    if (localMode && activeNoteId) {
        const activeNode = allNodes.find(n => n.noteId === activeNoteId)
        if (activeNode) {
            const visibleIds = new Set<string>([activeNode.id])

            // Step 1 — direct neighbours of the active note
            allEdges.forEach(e => {
                if (e.source === activeNode.id) visibleIds.add(e.target)
                if (e.target === activeNode.id) visibleIds.add(e.source)
            })

            // Step 2 — for every TAG neighbour, pull in all other notes
            // connected to that same tag (siblings sharing the tag)
            visibleIds.forEach(id => {
                if (nodeMap.get(id)?.type === 'tag') {
                    allEdges.forEach(e => {
                        if (e.source === id) visibleIds.add(e.target)
                        if (e.target === id) visibleIds.add(e.source)
                    })
                }
            })

            visibleNodes = allNodes.filter(n => visibleIds.has(n.id))
            // All edges whose both endpoints are in the visible set
            visibleEdges = allEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
        } else {
            // Active note not yet in graph (e.g. no tags/links) — show nothing
            visibleNodes = []
            visibleEdges = []
        }
    } else {
        visibleNodes = allNodes
        visibleEdges = allEdges
    }

    // Dot node visual radius constants (separate from physics r)
    const NOTE_DOT_R = 5.5
    const NOTE_DOT_R_HOV = 7
    const NOTE_DOT_R_ACTIVE = 8.5
    const TAG_DOT_R = 3.5

    const hoveredNode = visibleNodes.find(n => n.id === hovered)

    // Count connections for the empty-state message
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
                </defs>

                <rect width="100%" height="100%" fill={T.bg} />
                <rect width="100%" height="100%" fill="url(#g-dots)" />

                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                    {/* ── Edges ── */}
                    {visibleEdges.map((edge, i) => {
                        const s = nodeMap.get(edge.source), t = nodeMap.get(edge.target)
                        if (!s || !t) return null
                        const isActive = s.noteId === activeNoteId || t.noteId === activeNoteId
                        const isHov = s.id === hovered || t.id === hovered

                        if (isActive) return (
                            <g key={i}>
                                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                                    stroke={T.edgeActive} strokeWidth={2.5} strokeOpacity={0.18} filter="url(#f-eglow)" />
                                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                                    stroke={T.edgeActive} strokeWidth={1} strokeOpacity={0.7} />
                            </g>
                        )
                        return (
                            <line key={i}
                                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                                stroke={isHov ? T.edgeHover : T.edgeDefault}
                                strokeWidth={isHov ? 1 : 0.75}
                                strokeOpacity={isHov ? 0.8 : 0.6}
                            />
                        )
                    })}

                    {/* ── Tag nodes (dots) ── */}
                    {visibleNodes.filter(n => n.type === 'tag').map(node => {
                        const isHov = node.id === hovered
                        const connectedNotes = visibleEdges
                            .filter(e => e.target === node.id || e.source === node.id)
                            .map(e => e.source === node.id ? e.target : e.source)
                        const isActive = connectedNotes.some(nid => nodeMap.get(nid)?.noteId === activeNoteId)

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                <circle r={TAG_DOT_R}
                                    fill={isActive ? T.tagNodeActiveFill : isHov ? T.nodeHovFill : T.tagNodeFill}
                                />
                                <text y={TAG_DOT_R + 9} textAnchor="middle" fontSize={8}
                                    fill={isActive ? T.textTagActive : isHov ? T.textTagHover : T.textTag}
                                    fontWeight={isActive ? '600' : '400'}
                                    style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}
                                >
                                    #{node.label.length > 11 ? node.label.slice(0, 11) + '…' : node.label}
                                </text>
                            </g>
                        )
                    })}

                    {/* ── Note nodes (dots) ── */}
                    {visibleNodes.filter(n => n.type === 'note').map(node => {
                        const isActive = node.noteId === activeNoteId
                        const isHov = node.id === hovered
                        const dotR = isActive ? NOTE_DOT_R_ACTIVE : isHov ? NOTE_DOT_R_HOV : NOTE_DOT_R
                        const fill = isActive ? T.nodeActiveFill : isHov ? T.nodeHovFill : T.nodeFill

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                {/* Soft glow halo for active node */}
                                {isActive && (
                                    <circle r={NOTE_DOT_R_ACTIVE + 7} fill={T.nodeActiveFill} opacity={0.18}
                                        filter="url(#f-node-glow)" />
                                )}
                                <circle r={dotR} fill={fill} />
                                {/* Inner highlight for active */}
                                {isActive && (
                                    <circle r={3} fill="white" opacity={0.3} cy={-2} />
                                )}
                                <text
                                    y={dotR + 11}
                                    textAnchor="middle"
                                    fontSize={9.5}
                                    fill={isActive ? T.textNoteActive : isHov ? T.textNoteHover : T.textNote}
                                    fontWeight={isActive ? '600' : '500'}
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
