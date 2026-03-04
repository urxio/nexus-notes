"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Network } from "lucide-react"
import type { GEdge, GNode, Note, Person } from "../types"
import { buildGraph, tickSim } from "../lib/graph"

export function GraphPanel({ notes, people, activeNoteId, onSelectNote }: {
  notes: Note[]; people: Person[]; activeNoteId: string | null; onSelectNote: (id: string) => void
}) {
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
        if (width > 0 && height > 0) setSize({ w: width, h: height })
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
      }
      forceRender(k => k + 1)
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
      style={{ cursor: hovered ? 'pointer' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => { setHovered(null); panRef.current.active = false }}
      onWheel={handleWheel}
    >
      <svg width="100%" height="100%">
        <defs>
          <radialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg-grad)" />
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {edges.map((edge, i) => {
            const s = nodeMap.get(edge.source), t = nodeMap.get(edge.target)
            if (!s || !t) return null
            const activeEdge = (s.noteId === activeNoteId || t.noteId === activeNoteId)
            const hovEdge = (s.id === hovered || t.id === hovered)
            return (
              <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={activeEdge ? '#818cf8' : hovEdge ? '#64748b' : '#1e293b'}
                strokeWidth={activeEdge ? 2 : 1}
                strokeOpacity={activeEdge ? 0.9 : hovEdge ? 0.7 : 0.6}
              />
            )
          })}
          {nodes.filter(n => n.type === 'tag').map(node => {
            const isHov = node.id === hovered
            const connectedNotes = edges
              .filter(e => e.target === node.id || e.source === node.id)
              .map(e => e.source === node.id ? e.target : e.source)
            const isActive = connectedNotes.some(nid => nodeMap.get(nid)?.noteId === activeNoteId)
            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`} style={{ transition: 'none' }}>
                <circle r={node.r * (isHov ? 1.2 : 1)} fill="#0f172a"
                  stroke={isActive ? '#6366f1' : isHov ? '#475569' : '#1e293b'}
                  strokeWidth={isActive ? 2 : isHov ? 1.5 : 1}
                />
                <text textAnchor="middle" dominantBaseline="central" fontSize={8}
                  fill={isActive ? '#a5b4fc' : '#64748b'}
                  style={{ pointerEvents: 'none', fontFamily: 'monospace', userSelect: 'none' }}
                >
                  #{node.label.length > 9 ? node.label.slice(0, 9) + '…' : node.label}
                </text>
              </g>
            )
          })}
          {nodes.filter(n => n.type === 'note').map(node => {
            const isActive = node.noteId === activeNoteId
            const isHov = node.id === hovered
            const scale = isHov ? 1.12 : 1
            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                {isActive && <circle r={node.r * scale + 8} fill={node.color} fillOpacity={0.15} />}
                <circle r={node.r * scale} fill={node.color}
                  fillOpacity={isActive ? 1 : 0.8}
                  stroke={isActive ? '#fff' : isHov ? node.color : 'transparent'}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <text textAnchor="middle" y={-3} fontSize={15}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{node.emoji}</text>
                <text textAnchor="middle" y={node.r + 15} fontSize={9.5} fill="#e2e8f0"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.label.length > 13 ? node.label.slice(0, 13) + '…' : node.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> Note
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block border border-slate-600" /> Tag
        </span>
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {[
          { label: '+', action: () => setZoom(z => Math.min(4, z * 1.25)) },
          { label: '−', action: () => setZoom(z => Math.max(0.25, z * 0.8)) },
          { label: '⌂', action: () => { setPan({ x: 0, y: 0 }); setZoom(1) } },
        ].map(({ label, action }) => (
          <button key={label}
            className="w-7 h-7 rounded bg-slate-800/80 text-slate-400 text-sm flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors"
            onClick={e => { e.stopPropagation(); action() }}
          >{label}</button>
        ))}
      </div>
      <div className="absolute top-3 left-3 text-[10px] text-slate-600 font-mono tracking-wider">GRAPH VIEW</div>
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 text-xs gap-2">
          <Network className="w-8 h-8 opacity-30" />
          <span>Add tags to see connections</span>
        </div>
      )}
    </div>
  )
}
