import React, { useRef, useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { Maximize2, Minimize2, Network } from "lucide-react"

import { Note, Person, GNode, GEdge } from "@/lib/types"
import { buildGraph, tickSim } from "@/lib/graph"
import { NoteIcon } from "./note-icon"

export function GraphPanel({ notes, people, activeNoteId, onSelectNote, isExpanded, onToggleExpand }: {
    notes: Note[]; people: Person[]; activeNoteId: string | null; onSelectNote: (id: string) => void
    isExpanded: boolean; onToggleExpand: () => void
}) {
    const { resolvedTheme } = useTheme()
    const dark = resolvedTheme === 'dark'

    // Theme-aware color tokens
    const T = dark ? {
        bg: '#0d1117', dot: '#161e2e',
        cardFill: '#131929', cardActiveFill: '#0d1f38',
        cardBorder: '#1e2d45', cardActiveBorder: '#3b82f6',
        cardShadow: '#060c18', cardActiveShadow: '#1d3a6e',
        edgeDefault: '#162030', edgeHover: '#264460', edgeActive: '#3b82f6',
        tagFill: '#0f1520', tagActiveFill: '#0d1f38',
        tagBorder: '#1a2a40', tagActiveBorder: '#3b82f6',
        portDefault: '#1e2d45', portHover: '#3b82f6',
        textNote: '#7a94b8', textNoteActive: '#93c5fd', textNoteHover: '#a8bedc',
        textTag: '#4a6480', textTagActive: '#60a5fa', textTagHover: '#5a7a9a',
        tooltip: 'rgba(13,17,27,0.92)', tooltipBorder: 'rgba(59,130,246,0.25)', tooltipText: '#7a94b8',
        header: '#2a3f5a', ctrl: '#0f1520', ctrlBorder: '#1a2a40', ctrlText: '#2a3f5a',
        ctrlHoverText: '#3b82f6', ctrlHoverBorder: '#3b82f6',
        empty: '#1a2a40',
    } : {
        bg: '#f4f6f9', dot: '#d1d9e6',
        cardFill: '#ffffff', cardActiveFill: '#eff6ff',
        cardBorder: '#dde3ec', cardActiveBorder: '#3b82f6',
        cardShadow: '#94a3b8', cardActiveShadow: '#3b82f6',
        edgeDefault: '#c5d0e0', edgeHover: '#93b4d4', edgeActive: '#3b82f6',
        tagFill: '#ffffff', tagActiveFill: '#eff6ff',
        tagBorder: '#dde3ec', tagActiveBorder: '#93c5fd',
        portDefault: '#e2e8f0', portHover: '#3b82f6',
        textNote: '#475569', textNoteActive: '#1e40af', textNoteHover: '#334155',
        textTag: '#64748b', textTagActive: '#1d4ed8', textTagHover: '#3b82f6',
        tooltip: 'rgba(255,255,255,0.95)', tooltipBorder: '#dde3ec', tooltipText: '#475569',
        header: '#94a3b8', ctrl: '#ffffff', ctrlBorder: '#dde3ec', ctrlText: '#94a3b8',
        ctrlHoverText: '#3b82f6', ctrlHoverBorder: '#93c5fd',
        empty: '#cbd5e1',
    }
    const containerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ w: 340, h: 500 })
    const nodesRef = useRef<GNode[]>([])
    const edgesRef = useRef<GEdge[]>([])
    const [, forceRender] = useState(0)
    const rafRef = useRef<number>()
    const tickCountRef = useRef(0)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [hovered, setHovered] = useState<string | null>(null)
    const panRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0 })
    const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const ro = new ResizeObserver(entries => {
            for (const e of entries) {
                const { width, height } = e.contentRect
                // Defer setSize to avoid firing synchronously during React's commit phase
                // (triggered by rapid graphWidth updates during drag)
                if (width > 0 && height > 0) requestAnimationFrame(() => setSize({ w: width, h: height }))
            }
        })
        ro.observe(el)
        const rect = el.getBoundingClientRect()
        if (rect.width > 0) setSize({ w: rect.width, h: rect.height })
        return () => ro.disconnect()
    }, [])

    const graphKey = useMemo(
        () => notes.map(n => `${n.id}:${n.title}:${n.tags.join(',')}`).join('|') + '|p:' + people.map(p => p.id).join(','),
        [notes, people]
    )

    useEffect(() => {
        const { nodes, edges } = buildGraph(notes, people, size.w, size.h)
        nodesRef.current = nodes
        edgesRef.current = edges
        tickCountRef.current = 0
    }, [graphKey, size])

    useEffect(() => {
        function animate() {
            const tc = tickCountRef.current
            const alpha = tc < 280 ? Math.max(0.05, 1 - tc / 280) : (dragRef.current ? 0.05 : 0)
            if (alpha > 0) {
                tickSim(nodesRef.current, edgesRef.current, size.w, size.h, alpha)
                tickCountRef.current++
                // Only re-render when simulation is actually ticking — avoids calling setState
                // at 60fps when idle, which conflicted with concurrent-mode renders in React 18
                forceRender(k => k + 1)
            }
            rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [size])

    function toGraph(screenX: number, screenY: number) {
        const rect = containerRef.current!.getBoundingClientRect()
        return { x: (screenX - rect.left - pan.x) / zoom, y: (screenY - rect.top - pan.y) / zoom }
    }

    function nodeAt(sx: number, sy: number): GNode | null {
        const { x, y } = toGraph(sx, sy)
        for (const n of [...nodesRef.current].reverse()) {
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
            dragRef.current = { id: node.id, ox: x - node.x, oy: y - node.y }
        } else {
            panRef.current = { active: true, sx: e.clientX, sy: e.clientY, spx: pan.x, spy: pan.y }
        }
    }

    function handlePointerMove(e: React.PointerEvent) {
        const drag = dragRef.current
        if (drag) {
            const { x, y } = toGraph(e.clientX, e.clientY)
            const node = nodesRef.current.find(n => n.id === drag.id)
            if (node) { node.x = x - drag.ox; node.y = y - drag.oy; node.vx = 0; node.vy = 0 }
        } else if (panRef.current.active) {
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
            dragRef.current = null
        }
        panRef.current.active = false
    }

    function handleWheel(e: React.WheelEvent) {
        e.preventDefault()
        setZoom(z => Math.max(0.25, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))))
    }

    const nodes = nodesRef.current
    const edges = edgesRef.current
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    // Card half-dimensions
    const NW = 64, NH = 19   // note card: ±64 wide, ±19 tall
    const TW = 38, TH = 13   // tag pill:  ±38 wide, ±13 tall

    // Return the port point on the edge of a node facing toward (tx, ty)
    function port(node: GNode, tx: number): { x: number; y: number } {
        const hw = node.type === 'note' ? NW : TW
        return { x: tx >= node.x ? node.x + hw : node.x - hw, y: node.y }
    }

    // Smooth cubic bezier path between two port points
    function bezier(sp: { x: number; y: number }, tp: { x: number; y: number }): string {
        const cx = Math.max(55, Math.abs(tp.x - sp.x) * 0.55)
        const sx = tp.x >= sp.x ? 1 : -1
        return `M ${sp.x} ${sp.y} C ${sp.x + sx * cx} ${sp.y} ${tp.x - sx * cx} ${tp.y} ${tp.x} ${tp.y}`
    }

    const hoveredNode = nodes.find(n => n.id === hovered)

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
                    <filter id="f-card" x="-15%" y="-30%" width="130%" height="160%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={T.cardShadow} floodOpacity={dark ? '0.5' : '0.18'} />
                    </filter>
                    <filter id="f-card-active" x="-15%" y="-30%" width="130%" height="160%">
                        <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor={T.cardActiveShadow} floodOpacity="0.35" />
                    </filter>
                    <filter id="f-eglow" x="-5%" y="-300%" width="110%" height="700%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <style>{`
            @keyframes gph-flow { from{stroke-dashoffset:18} to{stroke-dashoffset:0} }
            .gph-dash { animation: gph-flow .8s linear infinite; }
          `}</style>
                </defs>

                <rect width="100%" height="100%" fill={T.bg} />
                <rect width="100%" height="100%" fill="url(#g-dots)" />

                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

                    {/* ── Edges ── */}
                    {edges.map((edge, i) => {
                        const s = nodeMap.get(edge.source), t = nodeMap.get(edge.target)
                        if (!s || !t) return null
                        const isActive = s.noteId === activeNoteId || t.noteId === activeNoteId
                        const isHov = s.id === hovered || t.id === hovered
                        const sp = port(s, t.x), tp = port(t, s.x)
                        const d = bezier(sp, tp)

                        if (isActive) return (
                            <g key={i}>
                                <path d={d} fill="none" stroke={T.edgeActive} strokeWidth={3.5} strokeOpacity={0.2} filter="url(#f-eglow)" />
                                <path d={d} fill="none" stroke={T.edgeActive} strokeWidth={1.5} strokeOpacity={0.85}
                                    strokeDasharray="5 4" className="gph-dash" />
                            </g>
                        )
                        return (
                            <path key={i} d={d} fill="none"
                                stroke={isHov ? T.edgeHover : T.edgeDefault}
                                strokeWidth={isHov ? 1.5 : 1}
                                strokeOpacity={isHov ? 0.9 : 0.7}
                            />
                        )
                    })}

                    {/* ── Tag nodes (pills) ── */}
                    {nodes.filter(n => n.type === 'tag').map(node => {
                        const isHov = node.id === hovered
                        const connectedNotes = edges
                            .filter(e => e.target === node.id || e.source === node.id)
                            .map(e => e.source === node.id ? e.target : e.source)
                        const isActive = connectedNotes.some(nid => nodeMap.get(nid)?.noteId === activeNoteId)

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                <rect x={-TW} y={-TH} width={TW * 2} height={TH * 2} rx={TH}
                                    fill={isActive ? T.tagActiveFill : T.tagFill}
                                    stroke={isActive ? T.tagActiveBorder : isHov ? T.edgeHover : T.tagBorder}
                                    strokeWidth={isActive ? 1.5 : 1}
                                    filter="url(#f-card)"
                                />
                                <circle cx={-TW} cy={0} r={4}
                                    fill={isActive ? T.edgeActive : isHov ? T.portHover : T.portDefault}
                                    stroke={T.cardFill} strokeWidth={1.5}
                                />
                                <circle cx={TW} cy={0} r={4}
                                    fill={isActive ? T.edgeActive : isHov ? T.portHover : T.portDefault}
                                    stroke={T.cardFill} strokeWidth={1.5}
                                />
                                <text textAnchor="middle" dominantBaseline="central" fontSize={8.5}
                                    fill={isActive ? T.textTagActive : isHov ? T.textTagHover : T.textTag}
                                    fontWeight={isActive ? '600' : '500'}
                                    style={{ pointerEvents: 'none', fontFamily: 'ui-sans-serif,system-ui,sans-serif', userSelect: 'none' }}
                                >
                                    #{node.label.length > 9 ? node.label.slice(0, 9) + '…' : node.label}
                                </text>
                            </g>
                        )
                    })}

                    {/* ── Note nodes (cards) ── */}
                    {nodes.filter(n => n.type === 'note').map(node => {
                        const isActive = node.noteId === activeNoteId
                        const isHov = node.id === hovered

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                <rect x={-NW} y={-NH} width={NW * 2} height={NH * 2} rx={7}
                                    fill={isActive ? T.cardActiveFill : T.cardFill}
                                    stroke={isActive ? T.cardActiveBorder : isHov ? T.edgeHover : T.cardBorder}
                                    strokeWidth={isActive ? 1.5 : 1}
                                    filter={isActive ? 'url(#f-card-active)' : 'url(#f-card)'}
                                />
                                <rect x={-NW} y={-NH} width={5} height={NH * 2} rx={7}
                                    fill={node.color} opacity={isActive ? 1 : isHov ? 0.85 : 0.7}
                                />
                                <rect x={-NW + 5} y={-NH} width={3} height={NH * 2} fill={node.color}
                                    opacity={isActive ? 0.25 : 0.12}
                                />
                                <circle cx={-NW} cy={0} r={5}
                                    fill={isActive ? node.color : isHov ? node.color : T.portDefault}
                                    stroke={T.cardFill} strokeWidth={2}
                                    opacity={isActive ? 1 : isHov ? 0.85 : 0.65}
                                />
                                <circle cx={NW} cy={0} r={5}
                                    fill={isActive ? node.color : isHov ? node.color : T.portDefault}
                                    stroke={T.cardFill} strokeWidth={2}
                                    opacity={isActive ? 1 : isHov ? 0.85 : 0.65}
                                />
                                <foreignObject x={-NW + 12} y={-10} width={20} height={20} style={{ pointerEvents: 'none' }}>
                                    <div className="w-full h-full flex items-center justify-center text-stone-500 dark:text-zinc-400">
                                        <NoteIcon iconName={node.emoji} className="w-4 h-4" />
                                    </div>
                                </foreignObject>
                                <text x={-NW + 36} textAnchor="start" dominantBaseline="central"
                                    fontSize={10.5}
                                    fill={isActive ? T.textNoteActive : isHov ? T.textNoteHover : T.textNote}
                                    fontWeight={isActive ? '600' : '500'}
                                    style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}
                                >
                                    {node.label.length > 10 ? node.label.slice(0, 10) + '…' : node.label}
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

            {/* ── Header + expand toggle ── */}
            <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[9px] font-semibold tracking-[.16em] uppercase"
                        style={{ color: T.header, fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>Graph</span>
                </div>
                <button
                    className="pointer-events-auto w-6 h-6 rounded-md flex items-center justify-center transition-all"
                    style={{ background: T.ctrl, border: `1px solid ${T.ctrlBorder}`, color: T.ctrlText }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.color = T.ctrlHoverText; el.style.borderColor = T.ctrlHoverBorder }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.color = T.ctrlText; el.style.borderColor = T.ctrlBorder }}
                    onClick={e => { e.stopPropagation(); onToggleExpand() }}
                    title={isExpanded ? 'Reduce graph' : 'Expand graph'}
                >
                    {isExpanded
                        ? <Minimize2 className="w-3 h-3" />
                        : <Maximize2 className="w-3 h-3" />}
                </button>
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
                        onClick={e => { e.stopPropagation(); fn() }}
                    >{label}</button>
                ))}
            </div>

            {/* ── Empty state ── */}
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <Network className="w-7 h-7" style={{ color: T.empty }} />
                    <span className="text-[10px] font-medium tracking-widest uppercase"
                        style={{ color: T.empty, fontFamily: 'ui-sans-serif,system-ui,sans-serif' }}>
                        Add tags to see connections
                    </span>
                </div>
            )}
        </div>
    )
}
