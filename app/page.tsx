"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Plus, Search, Hash, Network, FileText, Trash2, X,
  AlignLeft, Heading1, Heading2, Heading3, List, ListOrdered,
  Code2, Quote, CheckSquare, Minus, PanelLeftClose, PanelLeftOpen,
  ChevronRight, BookOpen, Calendar, GripVertical,
  User, Bold, Italic, Strikethrough, Palette, Underline,
  Maximize2, Minimize2
} from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useTheme } from "next-themes"
import { useToast } from "@/components/ui/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'bullet' | 'numbered' | 'quote' | 'code' | 'divider' | 'todo' | 'date' | 'toggle' | 'table'

interface Block {
  id: string
  type: BlockType
  content: string
  checked?: boolean
  open?: boolean
  expandedContent?: string
}

interface Note {
  id: string
  title: string
  emoji: string
  color: string
  blocks: Block[]
  tags: string[]
  createdAt: number
  updatedAt: number
  personId?: string
}

// ─── People ───────────────────────────────────────────────────────────────────

interface Person {
  id: string
  name: string
  emoji: string
  noteId?: string
  typeId?: string
}

// ─── Object Types ─────────────────────────────────────────────────────────────

interface ObjectType {
  id: string
  name: string
  emoji: string
  isBuiltin?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']
const NOTE_EMOJIS = ['📝', '💡', '🎯', '📚', '🔬', '🎨', '💻', '🌱', '⚡', '🔥', '📊', '🧠', '✨', '🚀', '🗒️', '📌']

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  h1: <Heading1 className="w-3.5 h-3.5" />,
  h2: <Heading2 className="w-3.5 h-3.5" />,
  h3: <Heading3 className="w-3.5 h-3.5" />,
  p: <AlignLeft className="w-3.5 h-3.5" />,
  bullet: <List className="w-3.5 h-3.5" />,
  numbered: <ListOrdered className="w-3.5 h-3.5" />,
  quote: <Quote className="w-3.5 h-3.5" />,
  code: <Code2 className="w-3.5 h-3.5" />,
  divider: <Minus className="w-3.5 h-3.5" />,
  todo: <CheckSquare className="w-3.5 h-3.5" />,
  date: <Calendar className="w-3.5 h-3.5" />,
  toggle: <ChevronRight className="w-3.5 h-3.5" />,
  table: <List className="w-3.5 h-3.5" />,
}

const BLOCK_LABELS: Record<BlockType, string> = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', p: 'Paragraph',
  bullet: 'Bullet List', numbered: 'Numbered List', quote: 'Quote',
  code: 'Code Block', divider: 'Divider', todo: 'To-do', date: 'Date',
  toggle: 'Toggle', table: 'Table',
}

const BLOCK_PLACEHOLDERS: Record<BlockType, string> = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  p: "Write something, or type '/' for commands…",
  bullet: 'List item', numbered: 'List item',
  quote: 'Quote…', code: 'Code…', divider: '', todo: 'To-do', date: '',
  toggle: 'Toggle header…', table: 'Table (use | to separate cells)…',
}

const SLASH_MENU_ITEMS: { type: BlockType; label: string; shortcut?: string }[] = [
  { type: 'p', label: 'Paragraph', shortcut: '' },
  { type: 'h1', label: 'Heading 1', shortcut: '#' },
  { type: 'h2', label: 'Heading 2', shortcut: '##' },
  { type: 'h3', label: 'Heading 3', shortcut: '###' },
  { type: 'toggle', label: 'Toggle', shortcut: '>>' },
  { type: 'bullet', label: 'Bullet List', shortcut: '-' },
  { type: 'numbered', label: 'Numbered List', shortcut: '1.' },
  { type: 'quote', label: 'Quote', shortcut: '>' },
  { type: 'code', label: 'Code Block', shortcut: '```' },
  { type: 'table', label: 'Table', shortcut: 'table' },
  { type: 'todo', label: 'To-do', shortcut: '[]' },
  { type: 'divider', label: 'Divider', shortcut: '---' },
  { type: 'date', label: 'Date', shortcut: '' },
]

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const SEED_NOTES: Note[] = [
  {
    id: 'seed-1', title: 'Welcome to Locus', emoji: '✨', color: '#6366f1',
    blocks: [
      { id: 'b1', type: 'h1', content: 'Welcome to Locus Notes' },
      { id: 'b2', type: 'p', content: 'A block editor with an Obsidian-style tag network. Tags connect notes and appear as edges in the graph view →' },
      { id: 'b3', type: 'bullet', content: 'Type  /  to insert blocks' },
      { id: 'b4', type: 'bullet', content: 'Use  #  shortcuts: # H1, ## H2, - bullets, > quote' },
      { id: 'b5', type: 'bullet', content: 'Add tags at the bottom to connect notes in the graph' },
      { id: 'b6', type: 'bullet', content: 'Click any node in the graph to open that note' },
    ],
    tags: ['welcome', 'getting-started'],
    createdAt: Date.now() - 7200000, updatedAt: Date.now(),
  },
  {
    id: 'seed-2', title: 'Ideas Board', emoji: '💡', color: '#f59e0b',
    blocks: [
      { id: 'b1', type: 'h2', content: 'Ideas to explore' },
      { id: 'b2', type: 'todo', content: 'Build something new', checked: false },
      { id: 'b3', type: 'todo', content: 'Learn a new skill', checked: true },
      { id: 'b4', type: 'todo', content: 'Ship it', checked: false },
      { id: 'b5', type: 'p', content: '' },
    ],
    tags: ['ideas', 'getting-started'],
    createdAt: Date.now() - 3600000, updatedAt: Date.now(),
  },
  {
    id: 'seed-3', title: 'Research Notes', emoji: '🔬', color: '#10b981',
    blocks: [
      { id: 'b1', type: 'h2', content: 'Research Notes' },
      { id: 'b2', type: 'quote', content: 'The more I learn, the more I realize how much I don\'t know. — Socrates' },
      { id: 'b3', type: 'p', content: 'Add your research findings here...' },
      { id: 'b4', type: 'code', content: 'const insight = "shared tags create knowledge graphs"' },
    ],
    tags: ['research', 'ideas'],
    createdAt: Date.now() - 1800000, updatedAt: Date.now(),
  },
]

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'locus-notes-v1'
const PEOPLE_STORAGE_KEY = 'locus-people-v1'
const OBJECT_TYPES_KEY = 'locus-object-types-v1'

const BUILTIN_OBJECT_TYPES: ObjectType[] = [
  { id: 'person', name: 'Person', emoji: '👤', isBuiltin: true },
  { id: 'project', name: 'Project', emoji: '📁', isBuiltin: true },
  { id: 'task', name: 'Task', emoji: '✅', isBuiltin: true },
]

function loadObjectTypes(): ObjectType[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OBJECT_TYPES_KEY)
    if (raw) return JSON.parse(raw)
  } catch { }
  return []
}

function saveObjectTypes(types: ObjectType[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(OBJECT_TYPES_KEY, JSON.stringify(types)) } catch { }
}
const PERSON_EMOJIS = ['👤', '👩', '👨', '🧑', '👩‍💻', '👨‍💻', '🧑‍🎨', '👩‍🎨', '🧑‍🏫', '👩‍🏫', '👨‍🏫', '🧑‍⚕️']

function loadPeople(): Person[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PEOPLE_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { }
  return []
}

function savePeople(people: Person[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)) } catch { }
}

function mkPerson(name: string): Person {
  return {
    id: crypto.randomUUID(),
    name,
    emoji: PERSON_EMOJIS[Math.floor(Math.random() * PERSON_EMOJIS.length)],
  }
}

function loadNotes(): Note[] {
  if (typeof window === 'undefined') return SEED_NOTES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { }
  return SEED_NOTES
}

function saveNotes(notes: Note[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) } catch { }
}

function mkNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled',
    emoji: NOTE_EMOJIS[Math.floor(Math.random() * NOTE_EMOJIS.length)],
    color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
    blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function mkBlock(type: BlockType = 'p'): Block {
  return { id: crypto.randomUUID(), type, content: '' }
}

function cloneBlock(b: Block): Block {
  return { id: crypto.randomUUID(), type: b.type, content: b.content, expandedContent: b.expandedContent, checked: b.checked }
}

// Split any blocks whose content contains \n into multiple separate blocks.
// Called when loading notes so corrupted blocks (from old paste behaviour) are healed.
function normalizeBlocks(blocks: Block[]): Block[] {
  const result: Block[] = []
  for (const b of blocks) {
    if (
      b.type !== 'code' &&
      b.type !== 'date' &&
      b.type !== 'toggle' &&
      b.type !== 'table' &&
      b.content.includes('\n')
    ) {
      const lines = b.content.split(/\r?\n/)
      result.push({ ...b, content: lines[0] })
      for (let i = 1; i < lines.length; i++) {
        result.push({ ...mkBlock('p'), content: lines[i] })
      }
    } else {
      result.push(b)
    }
  }
  return result.length > 0 ? result : [mkBlock('p')]
}

// ─── Graph Physics ────────────────────────────────────────────────────────────

interface GNode {
  id: string; type: 'note' | 'tag'; label: string; color: string
  emoji?: string; x: number; y: number; vx: number; vy: number; r: number; noteId?: string
}
interface GEdge { source: string; target: string }

function buildGraph(notes: Note[], people: Person[], w: number, h: number): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = []
  const edges: GEdge[] = []
  const tagSet = new Set<string>()
  notes.forEach(n => n.tags.forEach(t => tagSet.add(t)))
  const allTags = [...tagSet]
  const cx = w / 2, cy = h / 2
  notes.forEach((note, i) => {
    const a = (i / Math.max(notes.length, 1)) * Math.PI * 2
    const r = Math.min(w, h) * 0.30
    nodes.push({
      id: `note:${note.id}`, type: 'note', label: note.title || 'Untitled',
      color: note.color, emoji: note.emoji,
      x: cx + Math.cos(a) * r + (Math.random() - 0.5) * 60,
      y: cy + Math.sin(a) * r + (Math.random() - 0.5) * 60,
      vx: 0, vy: 0, r: 65, noteId: note.id,
    })
  })
  allTags.forEach((tag, i) => {
    const a = (i / Math.max(allTags.length, 1)) * Math.PI * 2
    const r = Math.min(w, h) * 0.12
    nodes.push({
      id: `tag:${tag}`, type: 'tag', label: tag, color: '#475569',
      x: cx + Math.cos(a) * r + (Math.random() - 0.5) * 30,
      y: cy + Math.sin(a) * r + (Math.random() - 0.5) * 30,
      vx: 0, vy: 0, r: 38,
    })
  })
  notes.forEach(note => note.tags.forEach(tag =>
    edges.push({ source: `note:${note.id}`, target: `tag:${tag}` })
  ))
  // Mention edges: connect notes that @mention a person to that person's note
  const personNoteMap = new Map(
    people.filter(p => p.noteId).map(p => [p.name.toLowerCase(), p.noteId!])
  )
  notes.forEach(note => {
    note.blocks.forEach(block => {
      const matches = (block.content + ' ' + (block.expandedContent ?? '')).match(/@(\S+)/g)
      if (!matches) return
      matches.forEach(m => {
        const name = m.slice(1).toLowerCase()
        const personNoteId = personNoteMap.get(name)
        if (personNoteId && personNoteId !== note.id &&
          !edges.some(e => e.source === `note:${note.id}` && e.target === `note:${personNoteId}`)) {
          edges.push({ source: `note:${note.id}`, target: `note:${personNoteId}` })
        }
      })
    })
  })
  return { nodes, edges }
}

function tickSim(nodes: GNode[], edges: GEdge[], w: number, h: number, alpha: number) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y
      const d = Math.sqrt(dx * dx + dy * dy) || 0.1
      const f = Math.min(12000 / (d * d), 80) * alpha
      const fx = (f * dx) / d, fy = (f * dy) / d
      nodes[i].vx -= fx; nodes[i].vy -= fy
      nodes[j].vx += fx; nodes[j].vy += fy
    }
  }
  const map = new Map(nodes.map(n => [n.id, n]))
  for (const { source, target } of edges) {
    const s = map.get(source), t = map.get(target)
    if (!s || !t) continue
    const dx = t.x - s.x, dy = t.y - s.y
    const d = Math.sqrt(dx * dx + dy * dy) || 0.1
    const f = (d - 160) * 0.045 * alpha
    const fx = (f * dx) / d, fy = (f * dy) / d
    s.vx += fx; s.vy += fy; t.vx -= fx; t.vy -= fy
  }
  for (const n of nodes) {
    n.vx += (w / 2 - n.x) * 0.004 * alpha
    n.vy += (h / 2 - n.y) * 0.004 * alpha
    n.vx *= 0.82; n.vy *= 0.82
    n.x = Math.max(n.r + 10, Math.min(w - n.r - 10, n.x + n.vx))
    n.y = Math.max(n.r + 10, Math.min(h - n.r - 10, n.y + n.vy))
  }
}

// ─── GraphPanel ───────────────────────────────────────────────────────────────

function GraphPanel({ notes, people, activeNoteId, onSelectNote, isExpanded, onToggleExpand }: {
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
                <text x={-NW + 22} textAnchor="middle" dominantBaseline="central"
                  fontSize={14} style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.emoji}
                </text>
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
            {hoveredNode.type === 'note' && <span>{hoveredNode.emoji}</span>}
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

// ─── DateBlock ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function DateBlock({ block, onUpdate }: { block: Block; onUpdate: (id: string, patch: Partial<Block>) => void }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(0)
  const [viewMonth, setViewMonth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const dateVal = block.content || new Date().toISOString().split('T')[0]

  // Keep view in sync with selected date whenever it changes
  useEffect(() => {
    const d = new Date(dateVal + 'T12:00:00')
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }, [dateVal])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const displayDate = (() => {
    try {
      return new Date(dateVal + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    } catch { return dateVal }
  })()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    onUpdate(block.id, { content: toIso(viewYear, viewMonth, day) })
    setOpen(false)
  }

  function goToday() {
    const t = new Date()
    onUpdate(block.id, { content: toIso(t.getFullYear(), t.getMonth(), t.getDate()) })
    setOpen(false)
  }

  // Build the calendar grid cells
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const t = new Date()
  const todayIso = toIso(t.getFullYear(), t.getMonth(), t.getDate())

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-2 py-1.5 group select-none">
      <Calendar className="w-4 h-4 text-primary/70 flex-shrink-0" />

      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm font-medium text-primary/80 hover:underline decoration-dotted underline-offset-2 cursor-pointer"
      >
        {displayDate}
      </button>

      <span className="text-xs text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
        click to edit
      </span>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-xl p-3 w-60">

          {/* Month / year nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-base leading-none">
              ‹
            </button>
            <span className="text-sm font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-base leading-none">
              ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const iso = toIso(viewYear, viewMonth, day)
              const isSelected = iso === dateVal
              const isToday = iso === todayIso
              return (
                <button key={i} onClick={() => selectDay(day)}
                  className={cn(
                    'text-xs rounded py-1 w-full text-center transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-accent text-foreground',
                    isToday && !isSelected && 'font-bold text-primary',
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-border text-center">
            <button onClick={goToday}
              className="text-xs text-primary hover:underline">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mention renderer ─────────────────────────────────────────────────────────

function injectMentionsIntoHtml(html: string, people: Person[]): string {
  if (!html) return ''
  const names = people.map(p => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean)
  if (names.length === 0) return html
  const mentionRe = new RegExp(`(<[^>]*>)|(@(?:${names.join('|')}))`, 'gi')
  return html.replace(mentionRe, (match, tag, name) => {
    if (tag) return match
    return `<span data-mention="${name.slice(1)}" class="underline decoration-dotted underline-offset-2 font-medium text-foreground/90 cursor-pointer hover:text-primary transition-colors">${match}</span>`
  })
}

// ─── Format Toolbar ──────────────────────────────────────────────────────────

function FormatToolbar() {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [showColors, setShowColors] = useState(false)

  const updatePosition = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPosition(null)
      setShowColors(false)
      return
    }
    const range = sel.getRangeAt(0)
    // Only show toolbar if selection is inside a contenteditable
    let node = range.startContainer as HTMLElement | null
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node || node.closest('[contenteditable="false"]') || !node.closest('[contenteditable="true"]')) {
      setPosition(null)
      setShowColors(false)
      return
    }
    const rect = range.getBoundingClientRect()
    setPosition({
      top: rect.top - 40,
      left: rect.left + rect.width / 2
    })
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', updatePosition)
    return () => document.removeEventListener('selectionchange', updatePosition)
  }, [updatePosition])

  if (!position) return null

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    // Keep focus and selection
    setTimeout(updatePosition, 10)
  }

  const TEXT_COLORS = [
    { label: 'Default', value: 'inherit' },
    { label: 'Gray', value: '#6b7280' },
    { label: 'Red', value: '#ef4444' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Yellow', value: '#eab308' },
    { label: 'Green', value: '#22c55e' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Purple', value: '#a855f7' },
    { label: 'Pink', value: '#ec4899' },
  ]
  const HIGHLIGHT_COLORS = [
    { label: 'Default', value: 'transparent' },
    { label: 'Gray', value: 'rgba(107,114,128,0.2)' },
    { label: 'Red', value: 'rgba(239,68,68,0.2)' },
    { label: 'Orange', value: 'rgba(249,115,22,0.2)' },
    { label: 'Yellow', value: 'rgba(234,179,8,0.2)' },
    { label: 'Green', value: 'rgba(34,197,94,0.2)' },
    { label: 'Blue', value: 'rgba(59,130,246,0.2)' },
    { label: 'Purple', value: 'rgba(168,85,247,0.2)' },
    { label: 'Pink', value: 'rgba(236,72,153,0.2)' },
  ]

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 flex items-center bg-popover border shadow-lg rounded-md px-1 py-1 gap-0.5"
      style={{ top: Math.max(10, position.top), left: position.left }}
      onMouseDown={e => e.preventDefault()} // Keep selection
    >
      {!showColors ? (
        <>
          <button onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Bold (Cmd+B)"><Bold className="w-4 h-4" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Italic (Cmd+I)"><Italic className="w-4 h-4" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Underline (Cmd+U)"><Underline className="w-4 h-4" /></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => exec('strikeThrough')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Strikethrough (Cmd+Shift+S)"><Strikethrough className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onMouseDown={e => e.preventDefault()} onClick={() => setShowColors(true)} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors relative" title="Text Color & Highlight">
            <Palette className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2 px-2 py-1 select-none">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Color</span>
            <button onMouseDown={e => e.preventDefault()} onClick={() => setShowColors(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
          </div>
          <div className="flex gap-1">
            {TEXT_COLORS.map(c => (
              <button key={`t-${c.label}`} onMouseDown={e => e.preventDefault()} onClick={() => { exec('foreColor', c.value); setShowColors(false) }}
                className="w-5 h-5 rounded-full border border-border/50 hover:scale-110 transition-transform flex items-center justify-center"
                style={{ color: c.value === 'inherit' ? 'currentColor' : c.value }} title={c.label}>
                <span className="text-[10px] font-bold">A</span>
              </button>
            ))}
          </div>
          <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider mt-1">Background</span>
          <div className="flex gap-1 pb-1">
            {HIGHLIGHT_COLORS.map(c => (
              <button key={`h-${c.label}`} onMouseDown={e => e.preventDefault()} onClick={() => { exec('hiliteColor', c.value); setShowColors(false) }}
                className="w-5 h-5 rounded border border-border/50 hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }} title={c.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BlockItem ────────────────────────────────────────────────────────────────

interface BlockItemProps {
  block: Block; index: number; listIndex: number; numBlocks: number; isFocused: boolean
  isSelected: boolean
  onUpdate: (id: string, patch: Partial<Block>) => void
  onInsert: (afterId: string, type?: BlockType, content?: string) => void
  onDelete: (id: string) => void
  onMergePrev: (id: string, content: string) => void
  onDuplicate?: (id: string) => void
  onFocus: (id: string) => void
  onSelect: (id: string, evt: React.MouseEvent) => void
  onDragSelectStart: (id: string, idx: number) => void
  onMouseEnterBlock: (idx: number) => void
  onPasteLines: (afterId: string, lines: string[]) => void
  people: Person[]
  onCreatePerson: (name: string, typeId?: string) => Person
  onFocusPrev: (id: string) => void
  onFocusNext: (id: string) => void
  onReorderDragStart: (id: string) => void
  isBeingDragged: boolean
  showDropIndicatorAbove: boolean
  onNavigateTo: (noteId: string) => void
  objectTypes: ObjectType[]
  onCreateObjectType: (name: string, emoji: string) => ObjectType
}

function BlockItem({ block, index, listIndex, numBlocks, isFocused, isSelected, onUpdate, onInsert, onDelete, onMergePrev, onDuplicate, onFocus, onSelect, onDragSelectStart, onMouseEnterBlock, onPasteLines, people, onCreatePerson, onFocusPrev, onFocusNext, onReorderDragStart, isBeingDragged, showDropIndicatorAbove, onNavigateTo, objectTypes, onCreateObjectType }: BlockItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Body contenteditable for toggle blocks (mounted only when block.open === true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [menuFilter, setMenuFilter] = useState('')
  const [menuIdx, setMenuIdx] = useState(0)
  const prevContentRef = useRef(block.content)
  // @ mention state
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIdx, setMentionIdx] = useState(0)
  const mentionAnchorRef = useRef<number>(-1)
  const activeEditorRef = useRef<'main' | 'body'>('main')
  const slashAnchorRef = useRef<number>(-1)
  // @ New-type inline form state
  const [showNewTypeForm, setShowNewTypeForm] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeEmoji, setNewTypeEmoji] = useState('🔖')

  // Set content imperatively on mount / type change / undo-redo content restore
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el) {
      el.innerHTML = block.content
    }
  }, [block.type, block.content])

  // Focus imperatively (cursor at start).
  // Depends on both isFocused AND block.type: when a slash-command changes the
  // type (e.g. p → bullet/todo) React unmounts the old contenteditable and
  // mounts a new one inside the wrapper div, losing focus. Adding block.type
  // here ensures we re-fire and restore focus after any type change.
  useEffect(() => {
    if (!isFocused || !ref.current) return
    // ref.current is null for date/divider (no contenteditable) — skip safely
    if (document.activeElement !== ref.current) {
      ref.current.focus()
    }
    try {
      const range = document.createRange()
      const sel = window.getSelection()
      if (ref.current.firstChild) {
        range.setStart(ref.current.firstChild, 0)
      } else {
        range.setStart(ref.current, 0)
      }
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch { }
  }, [isFocused, block.type])

  const filteredMenu = SLASH_MENU_ITEMS.filter(item =>
    item.label.toLowerCase().includes(menuFilter.toLowerCase()) ||
    item.type.includes(menuFilter.toLowerCase())
  )

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const text = el.textContent || ''
    const html = el.innerHTML || ''
    prevContentRef.current = text

    // Markdown shortcuts (auto-convert on space/special char)
    const shortcuts: [string | RegExp, BlockType][] = [
      ['# ', 'h1'], ['## ', 'h2'], ['### ', 'h3'],
      ['- ', 'bullet'], ['* ', 'bullet'],
      [/^1\. $/, 'numbered'],
      ['>> ', 'toggle'], ['> ', 'quote'],   // >> must come before > to avoid early match
      ['```', 'code'], ['---', 'divider'], ['[]', 'todo'], ['[ ]', 'todo'],
    ]
    for (const [pat, newType] of shortcuts) {
      const match = typeof pat === 'string' ? text === pat : pat.test(text)
      if (match) {
        if (ref.current) ref.current.textContent = ''
        const content = newType === 'date' ? new Date().toISOString().split('T')[0] : ''
        onUpdate(block.id, { type: newType, content })
        // date and divider have no contenteditable — auto-insert a paragraph after
        if (newType === 'date' || newType === 'divider') {
          setTimeout(() => onInsert(block.id, 'p', ''), 0)
        }
        return
      }
    }

    // @ mention and Slash menu
    try {
      const cursorEl = e.currentTarget
      const sel = window.getSelection()
      let isCollapsed = false
      let textBeforeCursor = text
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        isCollapsed = true
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(cursorEl, 0)
        pre.setEnd(range.startContainer, range.startOffset)
        textBeforeCursor = pre.toString()
      }

      const atMatch = isCollapsed ? textBeforeCursor.match(/@([^@\s]*)$/) : null
      if (atMatch) {
        setMentionFilter(atMatch[1])
        setMentionIdx(0)
        setShowMentionMenu(true)
        mentionAnchorRef.current = textBeforeCursor.length - atMatch[0].length
      } else {
        setShowMentionMenu(false)
        mentionAnchorRef.current = -1
      }

      const slashMatch = isCollapsed ? textBeforeCursor.match(/(?:^|\s)\/([^/\s]*)$/) : null
      if (slashMatch && !atMatch) {
        setMenuFilter(slashMatch[1])
        setMenuIdx(0)
        setShowMenu(true)
        const matchText = slashMatch[0]
        const spaceOffset = matchText.startsWith(' ') || matchText.startsWith('\n') ? 1 : 0
        slashAnchorRef.current = textBeforeCursor.length - matchText.length + spaceOffset
        activeEditorRef.current = 'main'
      } else {
        setShowMenu(false)
        slashAnchorRef.current = -1
      }
    } catch {
      setShowMentionMenu(false)
      setShowMenu(false)
    }

    onUpdate(block.id, { content: html })
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const plain = e.clipboardData.getData('text/plain')
    if (!plain) return

    const el = e.currentTarget
    const sel = window.getSelection()

    // Calculate cursor start/end as plain-text offsets
    let cursorStart = (el.textContent || '').length
    let cursorEnd = cursorStart
    if (sel && sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(el, 0)
        pre.setEnd(range.startContainer, range.startOffset)
        cursorStart = pre.toString().length
        cursorEnd = range.collapsed ? cursorStart : (() => {
          const post = document.createRange()
          post.setStart(el, 0)
          post.setEnd(range.endContainer, range.endOffset)
          return post.toString().length
        })()
      } catch { }
    }

    const existing = el.textContent || ''
    const before = existing.slice(0, cursorStart)
    const after = existing.slice(cursorEnd)
    const lines = plain.split(/\r?\n/)
    const firstLine = before + lines[0]

    if (lines.length === 1) {
      // Single-line paste: insert inline, keep DOM as plain text node
      const newContent = firstLine + after
      el.textContent = newContent
      // Restore cursor after inserted text
      try {
        const textNode = el.firstChild
        if (textNode) {
          const range = document.createRange()
          const pos = Math.min(firstLine.length, textNode.textContent?.length ?? 0)
          range.setStart(textNode, pos)
          range.collapse(true)
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      } catch { }
      onUpdate(block.id, { content: newContent })
    } else {
      // Multi-line paste: current block gets before + first line
      // Last line gets remainder of original content appended
      // Middle lines become their own blocks
      const lastLine = lines[lines.length - 1] + after
      const middleLines = lines.slice(1, -1)
      el.textContent = firstLine
      onUpdate(block.id, { content: firstLine })
      setTimeout(() => onPasteLines(block.id, [...middleLines, lastLine]), 0)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const text = e.currentTarget.textContent || ''

    if (showMenu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIdx(i => Math.min(i + 1, filteredMenu.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenuIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && filteredMenu[menuIdx]) {
        e.preventDefault()
        applyMenuItem(filteredMenu[menuIdx].type)
        return
      }
      if (e.key === 'Escape') { setShowMenu(false); slashAnchorRef.current = -1; return }
    }

    if (showMentionMenu) {
      const filteredPeople = people.filter(p =>
        p.name.toLowerCase().includes(mentionFilter.toLowerCase())
      )
      const totalItems = filteredPeople.length + (mentionFilter.trim().length > 0 && !filteredPeople.some(p => p.name.toLowerCase() === mentionFilter.toLowerCase()) ? 1 : 0)
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, totalItems - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredPeople[mentionIdx]) {
          insertMention(filteredPeople[mentionIdx].name)
        } else if (mentionIdx === filteredPeople.length && mentionFilter.trim()) {
          const person = onCreatePerson(mentionFilter.trim())
          insertMention(person.name)
        }
        return
      }
      if (e.key === 'Escape') { setShowMentionMenu(false); return }
    }

    // Arrow-key cross-block navigation
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && ref.current) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        const cursorRects = range.getClientRects()
        const elRect = ref.current.getBoundingClientRect()
        const lh = parseFloat(getComputedStyle(ref.current).lineHeight) || 24
        if (e.key === 'ArrowUp') {
          const top = cursorRects.length > 0 ? cursorRects[0].top : elRect.top
          if (top <= elRect.top + lh * 0.6) {
            e.preventDefault()
            onFocusPrev(block.id)
            return
          }
        } else {
          const last = cursorRects[cursorRects.length - 1]
          const bottom = last ? last.bottom : elRect.bottom
          if (bottom >= elRect.bottom - lh * 0.6) {
            e.preventDefault()
            onFocusNext(block.id)
            return
          }
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((block.type === 'bullet' || block.type === 'numbered') && !text) {
        onUpdate(block.id, { type: 'p', content: '' })
        return
      }

      // ── Split content at cursor position ──────────────────────────────────
      const el = e.currentTarget
      let beforeHtml = ''
      let afterHtml = ''
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        try {
          const range = sel.getRangeAt(0)

          const preRange = document.createRange()
          preRange.selectNodeContents(el)
          preRange.setEnd(range.startContainer, range.startOffset)
          const tempPre = document.createElement('div')
          tempPre.appendChild(preRange.cloneContents())
          beforeHtml = tempPre.innerHTML

          const postRange = document.createRange()
          postRange.selectNodeContents(el)
          postRange.setStart(range.endContainer, range.endOffset)
          const tempPost = document.createElement('div')
          tempPost.appendChild(postRange.cloneContents())
          afterHtml = tempPost.innerHTML
        } catch { }
      } else {
        beforeHtml = el.innerHTML
      }

      // Keep only the text before the cursor in the current block
      el.innerHTML = beforeHtml
      onUpdate(block.id, { content: beforeHtml })

      // New block carries the text that was after the cursor
      const nextType: BlockType = block.type === 'bullet' ? 'bullet' : block.type === 'numbered' ? 'numbered' : 'p'
      setTimeout(() => onInsert(block.id, nextType, afterHtml), 0)
      return
    }

    if (e.key === 'Backspace') {
      const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '')
      if (!cleanText) {
        e.preventDefault()
        if (numBlocks > 1) {
          // Any empty block can be deleted directly (matches Notion)
          onDelete(block.id)
        } else if (block.type !== 'p') {
          // Last block in note: convert to paragraph so the editor is never empty
          onUpdate(block.id, { type: 'p', content: '' })
        }
        return
      }

      // Non-empty block: if cursor is at position 0, merge this block's
      // content onto the end of the previous block (Notion-style).
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        let cursorAtStart = false
        try {
          const range = sel.getRangeAt(0)
          const pre = document.createRange()
          pre.setStart(e.currentTarget, 0)
          pre.setEnd(range.startContainer, range.startOffset)
          cursorAtStart = pre.toString().length === 0
        } catch { }
        if (cursorAtStart) {
          e.preventDefault()
          onMergePrev(block.id, text)
          return
        }
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      // indent bullet → sub-bullet (simple: just continue as bullet)
    }
  }

  // ── Mention insertion ─────────────────────────────────────────────────────
  function insertMention(personName: string) {
    const el = ref.current
    if (!el || mentionAnchorRef.current === -1) return
    const currentText = el.textContent || ''
    const anchorPos = mentionAnchorRef.current
    // Find current cursor position
    let cursorPos = currentText.length
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(el, 0)
        pre.setEnd(range.startContainer, range.startOffset)
        cursorPos = pre.toString().length
      } catch { }
    }
    // Replace @filter with @personName
    const mentionText = `@${personName}`
    const newText = currentText.slice(0, anchorPos) + mentionText + ' ' + currentText.slice(cursorPos)
    el.textContent = newText
    // Place cursor after the inserted mention
    const newCursorPos = anchorPos + mentionText.length + 1
    try {
      const textNode = el.firstChild
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange()
        const pos = Math.min(newCursorPos, (textNode as Text).length)
        range.setStart(textNode, pos)
        range.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    } catch { }
    onUpdate(block.id, { content: newText })
    setShowMentionMenu(false)
    setMentionFilter('')
    mentionAnchorRef.current = -1
  }

  // ── Toggle-body handlers ──────────────────────────────────────────────────
  // Callback ref: initialise body content the moment the element mounts (when
  // the toggle opens) without including block.expandedContent in deps (which
  // would reset the caret on every keystroke).
  const bodyCallbackRef = useCallback((el: HTMLDivElement | null) => {
    ; (bodyRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (el) el.innerHTML = block.expandedContent ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.open, block.type]) // re-initialise only when open/type changes

  function handleBodyInput(e: React.FormEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const text = el.textContent || ''
    const html = el.innerHTML || ''

    try {
      const cursorEl = e.currentTarget
      const sel = window.getSelection()
      let isCollapsed = false
      let textBeforeCursor = text
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        isCollapsed = true
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(cursorEl, 0)
        pre.setEnd(range.startContainer, range.startOffset)
        textBeforeCursor = pre.toString()
      }

      const slashMatch = isCollapsed ? textBeforeCursor.match(/(?:^|\s)\/([^/\s]*)$/) : null
      if (slashMatch) {
        setMenuFilter(slashMatch[1])
        setMenuIdx(0)
        setShowMenu(true)
        const matchText = slashMatch[0]
        const spaceOffset = matchText.startsWith(' ') || matchText.startsWith('\n') ? 1 : 0
        slashAnchorRef.current = textBeforeCursor.length - matchText.length + spaceOffset
        activeEditorRef.current = 'body'
      } else {
        setShowMenu(false)
        slashAnchorRef.current = -1
      }
    } catch {
      setShowMenu(false)
    }

    onUpdate(block.id, { expandedContent: html })
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (showMenu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIdx(i => Math.min(i + 1, filteredMenu.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenuIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && filteredMenu[menuIdx]) {
        e.preventDefault()
        applyMenuItem(filteredMenu[menuIdx].type)
        return
      }
      if (e.key === 'Escape') { setShowMenu(false); slashAnchorRef.current = -1; return }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onInsert(block.id, 'p', '')
      return
    }
    if (e.key === 'Backspace' && !e.currentTarget.textContent) {
      e.preventDefault()
      onUpdate(block.id, { open: false })
      // Return focus to the toggle header
      setTimeout(() => {
        if (!ref.current) return
        ref.current.focus()
        try {
          const range = document.createRange()
          const sel = window.getSelection()
          const node = ref.current.firstChild
          if (node && node.nodeType === Node.TEXT_NODE) {
            range.setStart(node, (node as Text).length)
          } else {
            range.setStart(ref.current, 0)
          }
          range.collapse(true)
          sel?.removeAllRanges()
          sel?.addRange(range)
        } catch { }
      }, 0)
      return
    }
  }

  function applyMenuItem(type: BlockType) {
    const activeIsBody = activeEditorRef.current === 'body'
    const el = activeIsBody ? bodyRef.current : ref.current
    const anchor = slashAnchorRef.current
    if (!el) return

    const currentAnchor = anchor !== -1 ? anchor : 0
    const currentText = el.textContent || ''

    // Find current cursor position
    let cursorPos = currentText.length
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(el, 0)
        pre.setEnd(range.startContainer, range.startOffset)
        cursorPos = pre.toString().length
      } catch { }
    }

    const beforeSlash = currentText.slice(0, currentAnchor)
    const afterCursor = currentText.slice(cursorPos)

    if (type === 'date') {
      const dateStr = new Date().toISOString().split('T')[0]
      const newText = beforeSlash + dateStr + afterCursor
      el.textContent = newText

      try {
        const textNode = el.firstChild
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const range = document.createRange()
          const pos = currentAnchor + dateStr.length
          range.setStart(textNode, pos)
          range.collapse(true)
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      } catch { }

      if (activeIsBody) {
        onUpdate(block.id, { expandedContent: newText })
      } else {
        onUpdate(block.id, { content: newText })
      }
    } else {
      if (activeIsBody) {
        // structural command from body: remove the slash command from body text
        const newBodyText = beforeSlash + afterCursor
        el.textContent = newBodyText
        onUpdate(block.id, { expandedContent: newBodyText })

        let newBlockContent = ''
        if (type === 'table') {
          newBlockContent = '   |   |   \n   |   |   \n   |   |   '
        }
        setTimeout(() => onInsert(block.id, type, newBlockContent), 0)
      } else {
        // structural command from main content: keep typed text but change block type
        let newBlockContent = beforeSlash + afterCursor
        if (type === 'table') {
          newBlockContent = '   |   |   \n   |   |   \n   |   |   '
        }
        el.textContent = newBlockContent
        onUpdate(block.id, { type, content: newBlockContent })

        if (type === 'divider') {
          setTimeout(() => onInsert(block.id, 'p', ''), 0)
        }
      }
    }

    setShowMenu(false)
    setMenuFilter('')
    slashAnchorRef.current = -1
  }

  function handleBlockDelete() {
    onDelete(block.id)
  }

  // For non-editable blocks (date / divider): any click selects them.
  function handleContainerClick(e: React.MouseEvent) {
    if (block.type === 'divider' || block.type === 'date') {
      e.preventDefault()
      onSelect(block.id, e)
    }
  }

  // Grip / left-margin mousedown → start (or extend with Shift/Cmd) block selection.
  // Using mousedown (not click) so dragging across blocks works immediately.
  function handleGripMouseDown(e: React.MouseEvent) {
    e.preventDefault()   // prevent browser text-selection during drag
    e.stopPropagation()
    const activeEl = document.activeElement as HTMLElement
    if (activeEl?.contentEditable === 'true') activeEl.blur()

    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      // Shift → range select, Cmd/Ctrl → toggle — both via onSelect
      onSelect(block.id, e)
    } else {
      // Plain mousedown → start a drag-select from this block
      onDragSelectStart(block.id, index)
    }
  }

  // Shared grip element used in all block variants
  const gripEl = (
    <div
      data-drag-handle
      onMouseDown={handleGripMouseDown}
      className={cn(
        "w-6 h-6 rounded cursor-grab active:cursor-grabbing flex items-center justify-center transition-opacity text-muted-foreground/40 hover:text-muted-foreground/70 flex-shrink-0",
        isSelected ? "opacity-60" : "opacity-0 group-hover:opacity-100"
      )}
      title="Drag to select · Shift+click range · Cmd+click toggle"
    >
      <GripVertical className="w-4 h-4" />
    </div>
  )

  // Divider block
  if (block.type === 'divider') {
    return (
      <div
        ref={containerRef}
        data-block-id={block.id}
        className={cn(
          "relative group -mx-7 px-7 py-2 transition-all rounded-sm cursor-pointer",
          isSelected && "bg-primary/10 ring-1 ring-primary/20"
        )}
        onClick={handleContainerClick}
        onMouseEnter={() => onMouseEnterBlock(index)}
      >
        <div className="flex items-center gap-2">
          {gripEl}
          <hr className="border-border flex-1" />
          <button
            className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); handleBlockDelete() }}
            title="Delete block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  // Date block
  if (block.type === 'date') {
    return (
      <div
        ref={containerRef}
        data-block-id={block.id}
        className={cn(
          "relative group -mx-7 px-7 py-2 transition-all rounded-sm",
          isSelected && "bg-primary/10 ring-1 ring-primary/20"
        )}
        onClick={handleContainerClick}
        onMouseEnter={() => onMouseEnterBlock(index)}
      >
        <div className="flex items-center gap-2">
          {gripEl}
          <DateBlock block={block} onUpdate={onUpdate} />
          <button
            className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive ml-auto"
            onClick={(e) => { e.stopPropagation(); handleBlockDelete() }}
            title="Delete block"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  const baseEditable = cn(
    "outline-none min-h-[1.4em] break-words flex-1",
  )
  const typeClass: Record<BlockType, string> = {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-2xl font-semibold',
    h3: 'text-xl font-semibold',
    p: 'text-base leading-relaxed',
    bullet: 'text-base leading-relaxed',
    numbered: 'text-base leading-relaxed',
    quote: 'text-base leading-relaxed italic border-l-4 border-primary/60 pl-4 text-foreground/70',
    code: 'text-sm font-mono bg-muted/80 dark:bg-muted rounded-md px-3 py-2 text-foreground/90',
    divider: '',
    todo: 'text-base leading-relaxed',
    date: '',
    toggle: 'text-base font-medium leading-relaxed',
    table: 'text-sm font-mono bg-muted/60 dark:bg-muted rounded-md px-3 py-2 text-foreground/90',
  }

  const editableEl = (
    <div className="relative flex-1">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={cn("outline-none min-h-[1.4em] break-words w-full", typeClass[block.type])}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => onFocus(block.id)}
        style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', display: isFocused ? undefined : 'none' }}
      />
      {isFocused && !block.content && (
        <div
          className={cn("absolute inset-0 pointer-events-none select-none text-muted-foreground/50", typeClass[block.type])}
          style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
          aria-hidden="true"
        >
          {BLOCK_PLACEHOLDERS[block.type]}
        </div>
      )}
      {!isFocused && (
        <div
          className={cn("outline-none min-h-[1.4em] break-words w-full cursor-text", typeClass[block.type])}
          style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
          onClick={(e) => {
            const target = e.target as HTMLElement
            if (target.matches('[data-mention]')) {
              e.stopPropagation()
              const name = target.getAttribute('data-mention')
              const person = people.find(p => p.name.toLowerCase() === name?.toLowerCase())
              if (person?.noteId && onNavigateTo) onNavigateTo(person.noteId)
              return
            }
            onFocus(block.id)
          }}
          dangerouslySetInnerHTML={{ __html: block.content ? injectMentionsIntoHtml(block.content, people) : '' }}
        />
      )}
    </div>
  )

  // Unified block container with selection support
  return (
    <div
      ref={containerRef}
      data-block-id={block.id}
      className={cn(
        "relative group -mx-7 px-7 py-1 transition-all rounded-sm",
        isSelected && "bg-primary/10 ring-1 ring-primary/20",
        isBeingDragged && "opacity-40"
      )}
      onClick={handleContainerClick}
      onMouseEnter={() => onMouseEnterBlock(index)}
    >
      {showDropIndicatorAbove && (
        <div className="absolute top-0 left-7 right-7 h-0.5 bg-primary rounded-full z-20 pointer-events-none" />
      )}
      {/* Left-margin mousedown zone: drag down to select blocks without entering text */}
      <div
        className="absolute left-0 top-0 bottom-0 w-7 cursor-pointer"
        onMouseDown={handleGripMouseDown}
      />
      <div className="flex items-start gap-2">
        {/* Drag handle — reorder */}
        <div
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onReorderDragStart(block.id) }}
          className={cn(
            "w-6 h-6 rounded cursor-grab active:cursor-grabbing flex items-center justify-center transition-opacity text-muted-foreground/40 hover:text-muted-foreground/70 flex-shrink-0 mt-1",
            isBeingDragged ? "opacity-60" : "opacity-0 group-hover:opacity-100"
          )}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Content */}
        {block.type === 'bullet' ? (
          <div className="flex items-baseline gap-2 flex-1">
            <span className="text-muted-foreground/60 leading-none select-none shrink-0 w-4 text-center">•</span>
            {editableEl}
          </div>
        ) : block.type === 'numbered' ? (
          <div className="flex items-baseline gap-1 flex-1">
            <span className="text-muted-foreground/60 text-sm tabular-nums select-none w-5 text-right shrink-0 leading-normal">{listIndex + 1}.</span>
            {editableEl}
          </div>
        ) : block.type === 'todo' ? (
          <div className="flex items-center gap-2 flex-1">
            <input type="checkbox" checked={block.checked ?? false}
              onChange={() => onUpdate(block.id, { checked: !block.checked })}
              className="rounded cursor-pointer accent-primary flex-shrink-0 w-4 h-4"
            />
            <div className="relative flex-1">
              <div ref={ref} contentEditable suppressContentEditableWarning
                className={cn("outline-none min-h-[1.4em] break-words w-full", 'text-base leading-relaxed', block.checked && 'line-through text-muted-foreground/60')}
                onKeyDown={handleKeyDown} onInput={handleInput} onPaste={handlePaste} onFocus={() => onFocus(block.id)}
                style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', display: isFocused ? undefined : 'none' }}
              />
              {isFocused && !block.content && (
                <div
                  className="absolute inset-0 pointer-events-none select-none text-base leading-relaxed text-muted-foreground/50"
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                  aria-hidden="true"
                >To-do</div>
              )}
              {!isFocused && (
                <div
                  className={cn("outline-none min-h-[1.4em] break-words w-full cursor-text", 'text-base leading-relaxed', block.checked && 'line-through text-muted-foreground/60')}
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.matches('[data-mention]')) {
                      e.stopPropagation()
                      const name = target.getAttribute('data-mention')
                      const person = people.find(p => p.name.toLowerCase() === name?.toLowerCase())
                      if (person?.noteId && onNavigateTo) onNavigateTo(person.noteId)
                      return
                    }
                    onFocus(block.id)
                  }}
                  dangerouslySetInnerHTML={{ __html: block.content ? injectMentionsIntoHtml(block.content, people) : '' }}
                />
              )}
            </div>
          </div>
        ) : block.type === 'toggle' ? (
          <div className="flex-1">
            {/* Toggle header row */}
            <div className="flex items-start gap-1">
              <button
                className="mt-[3px] flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onUpdate(block.id, { open: !block.open })}
                title={block.open ? 'Collapse' : 'Expand'}
              >
                <ChevronRight className={cn('w-4 h-4 transition-transform duration-150', block.open && 'rotate-90')} />
              </button>
              {editableEl}
            </div>
            {/* Toggle body — only rendered when open */}
            {block.open && (
              <div className="ml-5 mt-1 pl-3 border-l-2 border-muted-foreground/20">
                <div
                  ref={bodyCallbackRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Toggle content…"
                  className={cn(
                    baseEditable,
                    'text-base leading-relaxed text-foreground/75',
                    isFocused && 'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40',
                  )}
                  onInput={handleBodyInput}
                  onKeyDown={handleBodyKeyDown}
                  onFocus={() => onFocus(block.id)}
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', display: isFocused ? undefined : 'none' }}
                />
                {!isFocused && (
                  <div
                    className={cn(
                      baseEditable,
                      'text-base leading-relaxed text-foreground/75 cursor-text',
                      !block.expandedContent && 'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40'
                    )}
                    data-placeholder="Toggle content…"
                    style={{ whiteSpace: 'pre-wrap' }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.matches('[data-mention]')) {
                        e.stopPropagation()
                        const name = target.getAttribute('data-mention')
                        const person = people.find(p => p.name.toLowerCase() === name?.toLowerCase())
                        if (person?.noteId && onNavigateTo) onNavigateTo(person.noteId)
                        return
                      }
                      onFocus(block.id)
                    }}
                    dangerouslySetInnerHTML={{ __html: block.expandedContent ? injectMentionsIntoHtml(block.expandedContent, people) : '' }}
                  />
                )}
              </div>
            )}
          </div>
        ) : block.type === 'table' ? (
          <div className="flex-1">
            <div className="inline-block border rounded-md overflow-hidden bg-background/80">
              <table className="border-collapse text-sm">
                <tbody>
                  {block.content.split('\n').map((row, rowIdx) => {
                    const cells = row.split('|')
                    return (
                      <tr key={rowIdx}>
                        {cells.map((cell, colIdx) => (
                          <td
                            key={colIdx}
                            className="border border-border min-w-[80px] px-2 py-1 align-top"
                          >
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              className="outline-none whitespace-pre-wrap"
                              onInput={(e) => {
                                const text = e.currentTarget.textContent ?? ''
                                const rows = block.content.split('\n').map(r => r.split('|'))
                                if (!rows[rowIdx]) rows[rowIdx] = []
                                rows[rowIdx][colIdx] = text
                                const nextContent = rows
                                  .map(r => r.map(c => c ?? '').join('|'))
                                  .join('\n')
                                onUpdate(block.id, { content: nextContent })
                              }}
                            >
                              {cell}
                            </div>
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          editableEl
        )}

        {/* Delete button */}
        <button
          className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive flex-shrink-0 mt-1"
          onClick={(e) => { e.stopPropagation(); handleBlockDelete() }}
          title="Delete block (or press Backspace when empty)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slash command menu */}
      {showMenu && filteredMenu.length > 0 && (
        <div className="absolute left-12 top-full z-50 mt-1 w-56 rounded-lg border bg-popover shadow-lg overflow-hidden">
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium tracking-wider border-b">BLOCKS</div>
          <div className="py-1 max-h-52 overflow-y-auto">
            {filteredMenu.map((item, i) => (
              <button key={item.type}
                className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left",
                  i === menuIdx && 'bg-accent')}
                onMouseDown={e => { e.preventDefault(); applyMenuItem(item.type) }}
              >
                <span className="text-muted-foreground">{BLOCK_ICONS[item.type]}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1 rounded">{item.shortcut}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* @ Mention menu */}
      {showMentionMenu && (() => {
        const allTypes = [...BUILTIN_OBJECT_TYPES, ...objectTypes]
        const filteredObjects = people.filter(p =>
          p.name.toLowerCase().includes(mentionFilter.toLowerCase())
        )
        const trimmedFilter = mentionFilter.trim()
        const exactMatch = filteredObjects.some(p => p.name.toLowerCase() === trimmedFilter.toLowerCase())
        const canCreate = trimmedFilter.length > 0 && !exactMatch
        const createOptions = canCreate ? allTypes : []
        const NEW_TYPE_EMOJIS = ['🔖', '📋', '🏢', '🎯', '💼', '🔧', '🌐', '📅', '🎪', '🔑', '🧩', '⭐']
        return (
          <div className="absolute left-12 top-full z-50 mt-1 w-64 rounded-lg border bg-popover shadow-lg overflow-hidden">
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium tracking-wider border-b flex items-center gap-1.5">
              <User className="w-3 h-3" />
              OBJECTS
            </div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {filteredObjects.length === 0 && !canCreate && (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                  <User className="w-4 h-4 mx-auto mb-1 opacity-40" />
                  Type a name to create an object
                </div>
              )}
              {filteredObjects.map((person, i) => {
                const objType = allTypes.find(t => t.id === (person.typeId ?? 'person'))
                return (
                  <button key={person.id}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left",
                      i === mentionIdx && 'bg-accent')}
                    onMouseDown={e => { e.preventDefault(); insertMention(person.name) }}
                  >
                    <span className="text-base leading-none">{person.emoji}</span>
                    <span className="flex-1">{person.name}</span>
                    {objType && <span className="text-[10px] text-muted-foreground/60">{objType.name}</span>}
                  </button>
                )
              })}
              {canCreate && (
                <>
                  {filteredObjects.length > 0 && <div className="border-t my-1" />}
                  {!showNewTypeForm && (
                    <div className="px-2 py-1 text-[10px] text-muted-foreground/60 font-medium">Create as…</div>
                  )}
                  {!showNewTypeForm && createOptions.map((objType, i) => (
                    <button
                      key={objType.id}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left",
                        filteredObjects.length + i === mentionIdx && 'bg-accent')}
                      onMouseDown={e => {
                        e.preventDefault()
                        const person = onCreatePerson(trimmedFilter, objType.id)
                        insertMention(person.name)
                      }}
                    >
                      <span className="text-base leading-none">{objType.emoji}</span>
                      <span className="text-muted-foreground flex-1">
                        <span className="text-foreground font-medium">{trimmedFilter}</span>
                        <span className="text-muted-foreground"> · {objType.name}</span>
                      </span>
                    </button>
                  ))}
                  {/* New custom type option */}
                  {!showNewTypeForm && (
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left text-muted-foreground border-t mt-1 pt-2"
                      onMouseDown={e => { e.preventDefault(); setShowNewTypeForm(true); setNewTypeName(''); setNewTypeEmoji('🔖') }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New type…</span>
                    </button>
                  )}
                  {/* Inline new-type form */}
                  {showNewTypeForm && (
                    <div className="px-3 py-2 space-y-2" onMouseDown={e => e.preventDefault()}>
                      <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">New Type</div>
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={newTypeName}
                          onChange={e => setNewTypeName(e.target.value)}
                          placeholder="Type name…"
                          className="flex-1 text-sm bg-muted/60 rounded px-2 py-1.5 outline-none border border-transparent focus:border-input"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTypeName.trim()) {
                              e.preventDefault()
                              const newType = onCreateObjectType(newTypeName.trim(), newTypeEmoji)
                              const person = onCreatePerson(trimmedFilter, newType.id)
                              insertMention(person.name)
                              setShowNewTypeForm(false)
                            }
                            if (e.key === 'Escape') { setShowNewTypeForm(false) }
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {NEW_TYPE_EMOJIS.map(em => (
                          <button
                            key={em}
                            className={cn("w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-base transition-colors", newTypeEmoji === em && 'bg-accent ring-1 ring-primary/30')}
                            onMouseDown={e => { e.preventDefault(); setNewTypeEmoji(em) }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          className="flex-1 text-xs px-2 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium"
                          onMouseDown={e => {
                            e.preventDefault()
                            if (!newTypeName.trim()) return
                            const newType = onCreateObjectType(newTypeName.trim(), newTypeEmoji)
                            const person = onCreatePerson(trimmedFilter, newType.id)
                            insertMention(person.name)
                            setShowNewTypeForm(false)
                          }}
                        >
                          Create {newTypeEmoji} {newTypeName || '…'}
                        </button>
                        <button
                          className="text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          onMouseDown={e => { e.preventDefault(); setShowNewTypeForm(false) }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

// ─── NoteEditor ───────────────────────────────────────────────────────────────

function NoteEditor({ note, allTags, onChange, onDelete, people, onCreatePerson, onNavigateTo, objectTypes, onCreateObjectType }: {
  note: Note,
  allTags: string[],
  onChange: (noteId: string, updates: Partial<Note>) => void,
  onDelete: (noteId: string) => void,
  people: Person[],
  onCreatePerson: (name: string) => Person,
  onNavigateTo?: (noteId: string) => void,
  objectTypes: ObjectType[],
  onCreateObjectType: (name: string, emoji: string) => ObjectType
}) {
  const { toast } = useToast()

  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null)

  // ── Undo / Redo ─────────────────────────────────────────────────────────────
  // Two stacks: past (undo) and future (redo).
  // For text edits we debounce 800 ms and capture the pre-typing snapshot so
  // rapid typing collapses into one history entry.
  const pastRef   = useRef<Block[][]>([])
  const futureRef = useRef<Block[][]>([])
  // Snapshot captured at the start of a typing burst (before any keys land)
  const preTypingRef   = useRef<Block[] | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Immediate push – used for structural changes (add/delete/type/reorder)
  function pushHistory(snapshot: Block[]) {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
      preTypingRef.current   = null
    }
    pastRef.current   = [...pastRef.current, snapshot]
    futureRef.current = []
  }

  // Debounced push – used for keystroke-level content edits.
  // Saves the state from BEFORE the typing burst begins.
  function debouncedPushHistory(snapshot: Block[]) {
    if (!typingTimerRef.current) {
      preTypingRef.current = snapshot   // capture pre-typing state on first key
    } else {
      clearTimeout(typingTimerRef.current)
    }
    typingTimerRef.current = setTimeout(() => {
      if (preTypingRef.current) {
        pastRef.current   = [...pastRef.current, preTypingRef.current]
        futureRef.current = []
        preTypingRef.current = null
      }
      typingTimerRef.current = null
    }, 800)
  }

  function undo() {
    // Blur the focused element so the BlockItem useEffect can update innerHTML
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    // Typing in progress — cancel the debounce and jump back to pre-typing state
    if (typingTimerRef.current && preTypingRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
      const previous       = preTypingRef.current
      preTypingRef.current = null
      futureRef.current    = [note.blocks, ...futureRef.current]
      onChange(note.id, { blocks: previous })
      return
    }
    if (pastRef.current.length === 0) return
    const previous     = pastRef.current[pastRef.current.length - 1]
    pastRef.current    = pastRef.current.slice(0, -1)
    futureRef.current  = [note.blocks, ...futureRef.current]
    onChange(note.id, { blocks: previous })
  }

  function redo() {
    if (futureRef.current.length === 0) return
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    const next        = futureRef.current[0]
    pastRef.current   = [...pastRef.current, note.blocks]
    futureRef.current = futureRef.current.slice(1)
    onChange(note.id, { blocks: next })
  }

  // Always-fresh refs so the global keydown handler (registered once) always
  // calls the latest undo/redo closure with current note.blocks.
  const undoRef = useRef(undo)
  const redoRef = useRef(redo)
  useEffect(() => {
    undoRef.current = undo
    redoRef.current = redo
  })
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Auto-focus first block when a fresh (single empty block) note is opened
  useEffect(() => {
    if (note.blocks.length === 1 && !note.blocks[0].content) {
      setFocusedBlockId(note.blocks[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleUpdateBlock(id: string, updates: Partial<Block>) {
    const next = note.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    if ('type' in updates || 'checked' in updates) {
      pushHistory(note.blocks)
    } else {
      debouncedPushHistory(note.blocks)
    }
    onChange(note.id, { blocks: next })
  }

  function selectBlock(blockId: string, evt: React.MouseEvent) {
    const idx = note.blocks.findIndex(b => b.id === blockId)
    if (idx === -1) return

    if (evt.shiftKey && lastSelectedIdx !== null) {
      // Range select
      const ids = new Set<string>()
      for (let i = Math.min(idx, lastSelectedIdx); i <= Math.max(idx, lastSelectedIdx); i++) {
        ids.add(note.blocks[i].id)
      }
      setSelectedBlockIds(ids)
      setLastSelectedIdx(idx)
    } else if (evt.metaKey || evt.ctrlKey) {
      // Add/remove from selection
      const newSelection = new Set(selectedBlockIds)
      if (newSelection.has(blockId)) {
        newSelection.delete(blockId)
      } else {
        newSelection.add(blockId)
      }
      setSelectedBlockIds(newSelection)
      setLastSelectedIdx(idx)
    } else {
      // Single select
      setSelectedBlockIds(new Set([blockId]))
      setLastSelectedIdx(idx)
    }
  }

  // Ref: when set, the next focusedBlockId-change effect will place the cursor
  // at a specific position (and optionally sync DOM content) instead of start.
  const pendingCursorRef = useRef<{ id: string; pos: number; content?: string } | null>(null)

  // ── Block reorder drag ───────────────────────────────────────────────────
  const [reorderDragId, setReorderDragId] = useState<string | null>(null)
  const [reorderDropIdx, setReorderDropIdx] = useState<number | null>(null)
  const reorderRef = useRef<{ dragId: string | null; dropIdx: number | null }>({ dragId: null, dropIdx: null })

  function startReorderDrag(blockId: string) {
    reorderRef.current = { dragId: blockId, dropIdx: null }
    setReorderDragId(blockId)
    setFocusedBlockId(null)
    setSelectedBlockIds(new Set())
      ; (document.activeElement as HTMLElement)?.blur()
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!reorderRef.current.dragId) return
      const blockEls = Array.from(document.querySelectorAll('[data-block-id]'))
      let dropIdx = blockEls.length
      for (let i = 0; i < blockEls.length; i++) {
        const rect = blockEls[i].getBoundingClientRect()
        if (e.clientY < rect.top + rect.height / 2) { dropIdx = i; break }
      }
      reorderRef.current.dropIdx = dropIdx
      setReorderDropIdx(dropIdx)
    }
    function onMouseUp() {
      const { dragId, dropIdx } = reorderRef.current
      if (dragId !== null && dropIdx !== null) {
        const blocks = noteBlocksRef.current
        const fromIdx = blocks.findIndex(b => b.id === dragId)
        if (fromIdx !== -1 && dropIdx !== fromIdx && dropIdx !== fromIdx + 1) {
          const newBlocks = [...blocks]
          const [removed] = newBlocks.splice(fromIdx, 1)
          const insertAt = dropIdx > fromIdx ? dropIdx - 1 : dropIdx
          newBlocks.splice(insertAt, 0, removed)
          pushHistory(newBlocks)
          onChange(note.id, { blocks: newBlocks })
        }
      }
      reorderRef.current = { dragId: null, dropIdx: null }
      setReorderDragId(null)
      setReorderDropIdx(null)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onChange, pushHistory, note.id])

  // ── Arrow-key cross-block navigation ────────────────────────────────────
  function focusPrevBlock(id: string) {
    const idx = note.blocks.findIndex(b => b.id === id)
    if (idx <= 0) return
    const prev = note.blocks[idx - 1]
    if (prev.type === 'date' || prev.type === 'divider') { setFocusedBlockId(prev.id); return }
    pendingCursorRef.current = { id: prev.id, pos: prev.content.length }
    setFocusedBlockId(prev.id)
  }

  function focusNextBlock(id: string) {
    const idx = note.blocks.findIndex(b => b.id === id)
    if (idx >= note.blocks.length - 1) return
    const next = note.blocks[idx + 1]
    setFocusedBlockId(next.id)
  }

  function deleteBlock(id: string) {
    const idx = note.blocks.findIndex(b => b.id === id)
    const prev = note.blocks[idx - 1]
    const newBlocks = note.blocks.filter(b => b.id !== id)
    pushHistory(note.blocks)
    onChange(note.id, { blocks: newBlocks })
    if (prev) {
      // Place cursor at end of the previous block, not start
      pendingCursorRef.current = { id: prev.id, pos: prev.content.length }
      setFocusedBlockId(prev.id)
    }
    // Clear selection
    selectedBlockIds.delete(id)
    setSelectedBlockIds(new Set(selectedBlockIds))
  }

  // Merge blockId into its predecessor: append content to prev block's text,
  // delete blockId, and place cursor at the join point.
  function mergePrevBlock(blockId: string, content: string) {
    const idx = note.blocks.findIndex(b => b.id === blockId)
    if (idx <= 0) return
    const prev = note.blocks[idx - 1]
    if (prev.type === 'date' || prev.type === 'divider' || prev.type === 'toggle') return
    const mergedContent = prev.content + content
    const newBlocks = note.blocks
      .filter(b => b.id !== blockId)
      .map(b => b.id === prev.id ? { ...b, content: mergedContent } : b)
    pushHistory(newBlocks)
    onChange(note.id, { blocks: newBlocks })
    // cursor lands right at the join: after prev's original text
    pendingCursorRef.current = { id: prev.id, pos: prev.content.length, content: mergedContent }
    setFocusedBlockId(prev.id)
  }

  // Apply pending cursor position after React re-renders.
  // Runs whenever focusedBlockId changes — child (BlockItem) effects run first
  // (they place cursor at start), then this parent effect overrides to the
  // correct position. content is also synced here when a merge happened.
  useEffect(() => {
    const p = pendingCursorRef.current
    if (!p || p.id !== focusedBlockId) return
    pendingCursorRef.current = null

    const el = document.querySelector(
      `[data-block-id="${p.id}"] [contenteditable]`
    ) as HTMLElement | null
    if (!el) return

    // Sync DOM text if a merge changed the content (content-sync effect only
    // fires on type changes, not content changes, to avoid cursor jump on typing)
    if (p.content !== undefined) el.textContent = p.content

    el.focus()
    try {
      const range = document.createRange()
      const sel = window.getSelection()
      const node = el.firstChild
      if (node && node.nodeType === Node.TEXT_NODE) {
        const pos = Math.min(p.pos, node.textContent?.length ?? 0)
        range.setStart(node, pos)
      } else {
        range.setStart(el, 0)
      }
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch { }
  }, [focusedBlockId])



  function deleteSelectedBlocks() {
    if (selectedBlockIds.size === 0) return
    const newBlocks = note.blocks.filter(b => !selectedBlockIds.has(b.id))
    if (newBlocks.length === 0) {
      // Don't allow deleting all blocks, keep one empty paragraph
      const emptyBlock = mkBlock('p')
      pushHistory(note.blocks) // Push current state before change
      onChange(note.id, { blocks: [emptyBlock] })
    } else {
      pushHistory(note.blocks) // Push current state before change
      onChange(note.id, { blocks: newBlocks })
    }
    setSelectedBlockIds(new Set())
    setLastSelectedIdx(null)
  }

  function insertPastedLines(afterId: string, lines: string[]) {
    const blocks = noteBlocksRef.current
    const idx = blocks.findIndex(b => b.id === afterId)
    if (idx === -1) return
    const newBlocks = lines.map(line => ({ ...mkBlock('p'), content: line }))
    const updated = [
      ...blocks.slice(0, idx + 1),
      ...newBlocks,
      ...blocks.slice(idx + 1),
    ]
    pushHistory(note.blocks) // Push current state before change
    onChange(note.id, { blocks: updated })
    setFocusedBlockId(newBlocks[newBlocks.length - 1].id)
  }

  function insertBlockAfter(afterId: string, type: BlockType = 'p', content: string = '') {
    const nb = { ...mkBlock(type), content }
    // Use noteBlocksRef (always-fresh) instead of note.blocks so that calls
    // from setTimeout (e.g. after /date inserts a trailing paragraph) see the
    // already-updated blocks rather than the stale closure value.
    const blocks = noteBlocksRef.current
    const idx = blocks.findIndex(b => b.id === afterId)
    const newBlocks = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
    pushHistory(note.blocks) // Push current state before change
    onChange(note.id, { blocks: newBlocks })
    setFocusedBlockId(nb.id)
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!t || note.tags.includes(t)) return
    onChange(note.id, { tags: [...note.tags, t] })
    setTagInput('')
    setTagSuggestions([])
  }

  function removeTag(tag: string) {
    onChange(note.id, { tags: note.tags.filter(t => t !== tag) })
  }

  function handleTagInputChange(val: string) {
    setTagInput(val)
    if (val.trim()) {
      const q = val.trim().toLowerCase()
      setTagSuggestions(allTags.filter(t => t.includes(q) && !note.tags.includes(t)).slice(0, 6))
    } else {
      setTagSuggestions([])
    }
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && note.tags.length > 0) {
      removeTag(note.tags[note.tags.length - 1])
    }
  }

  // Global keyboard shortcuts - using refs to avoid closure issues
  const selectedIdsRef = useRef(selectedBlockIds)
  const deleteSelectedBlocksRef = useRef(deleteSelectedBlocks)
  // Cross-block text-selection handler ref (updated whenever blocks/onChange changes)
  const crossBlockDeleteRef = useRef<(charToInsert?: string) => boolean>(() => false)

  useEffect(() => {
    selectedIdsRef.current = selectedBlockIds
  }, [selectedBlockIds])

  useEffect(() => {
    deleteSelectedBlocksRef.current = deleteSelectedBlocks
  }, [note.blocks, selectedBlockIds])

  // ── Drag-select refs ────────────────────────────────────────────────────────
  // Always-fresh view of blocks list (needed inside window event handlers)
  const noteBlocksRef = useRef(note.blocks)
  const isDraggingRef = useRef(false)
  const dragAnchorIdxRef = useRef<number | null>(null)

  useEffect(() => { noteBlocksRef.current = note.blocks }, [note.blocks])

  // ── Cross-block text-selection editing ──────────────────────────────────────
  // When the browser selection spans multiple [data-block-id] elements, normal
  // keyboard events can't delete/replace across them because each block is an
  // independent contenteditable. This ref is kept fresh and called from the
  // global keydown handler to merge boundaries and optionally insert a char.
  useEffect(() => {
    crossBlockDeleteRef.current = function handleCrossBlockTextEdit(charToInsert?: string): boolean {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false

      const range = sel.getRangeAt(0)

      // Walk up from a node to find the nearest [data-block-id] container
      function getBlockEl(node: Node): HTMLElement | null {
        let n: Node | null = node
        while (n && n !== document.body) {
          if (n instanceof HTMLElement && n.hasAttribute('data-block-id')) return n
          n = n.parentNode
        }
        return null
      }

      const startBlockEl = getBlockEl(range.startContainer)
      const endBlockEl = getBlockEl(range.endContainer)

      // Only act on genuine cross-block selections
      if (!startBlockEl || !endBlockEl || startBlockEl === endBlockEl) return false

      const startBlockId = startBlockEl.getAttribute('data-block-id')!
      const endBlockId = endBlockEl.getAttribute('data-block-id')!

      const blocks = noteBlocksRef.current
      const startIdx = blocks.findIndex(b => b.id === startBlockId)
      const endIdx = blocks.findIndex(b => b.id === endBlockId)
      if (startIdx === -1 || endIdx === -1) return false

      // Normalise so fromIdx < toIdx (handle backward selections)
      const forward = startIdx <= endIdx
      const [fromIdx, toIdx] = forward ? [startIdx, endIdx] : [endIdx, startIdx]
      const [fromEl, toEl] = forward ? [startBlockEl, endBlockEl] : [endBlockEl, startBlockEl]
      const [fromNode, fromOff] = forward
        ? [range.startContainer, range.startOffset]
        : [range.endContainer, range.endOffset]
      const [toNode, toOff] = forward
        ? [range.endContainer, range.endOffset]
        : [range.startContainer, range.startOffset]

      // Get contenteditable within a block (fall back to block el itself)
      function getEditable(el: HTMLElement): HTMLElement {
        return (el.querySelector('[contenteditable]') as HTMLElement) ?? el
      }

      const fromEditable = getEditable(fromEl)
      const toEditable = getEditable(toEl)

      // Measure plain-text offset from start of each editable to the range endpoint
      let startTextOffset = 0
      let endTextOffset = (toEditable.textContent || '').length

      try {
        const r = document.createRange()
        r.setStart(fromEditable, 0)
        r.setEnd(fromNode, fromOff)
        startTextOffset = r.toString().length
      } catch { startTextOffset = 0 }

      try {
        const r = document.createRange()
        r.setStart(toEditable, 0)
        r.setEnd(toNode, toOff)
        endTextOffset = r.toString().length
      } catch { endTextOffset = (toEditable.textContent || '').length }

      const fromBlock = blocks[fromIdx]
      const toBlock = blocks[toIdx]

      // Merge: keep text before cursor in start block + optional char + text after cursor in end block
      const mergedContent = fromBlock.content.slice(0, startTextOffset)
        + (charToInsert ?? '')
        + toBlock.content.slice(endTextOffset)
      const cursorPos = startTextOffset + (charToInsert ? charToInsert.length : 0)

      // Build new blocks array: replace fromBlock with merged, drop everything from fromIdx+1..toIdx
      const newBlocks: Block[] = []
      for (let i = 0; i < blocks.length; i++) {
        if (i === fromIdx) newBlocks.push({ ...fromBlock, content: mergedContent })
        else if (i > fromIdx && i <= toIdx) { /* deleted */ }
        else newBlocks.push(blocks[i])
      }

      // Synchronously update the start-block's DOM before React re-renders.
      // The BlockItem content-sync effect only fires on type changes (by design,
      // to prevent cursor jumps during typing), so we must patch the DOM here —
      // otherwise the contenteditable still shows the old text after deletion.
      if (fromEditable) fromEditable.textContent = mergedContent

      // Clear the browser selection before updating React state
      sel.removeAllRanges()

      pushHistory(note.blocks) // Push current state before change
      onChange(note.id, { blocks: newBlocks })
      setFocusedBlockId(fromBlock.id)

      // Place cursor at the merge point after React re-renders
      setTimeout(() => {
        const el = document.querySelector(
          `[data-block-id="${fromBlock.id}"] [contenteditable]`
        ) as HTMLElement | null
        if (!el) return
        el.focus()
        try {
          const textNode = el.firstChild
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const r = document.createRange()
            const pos = Math.min(cursorPos, textNode.textContent?.length ?? 0)
            r.setStart(textNode, pos)
            r.collapse(true)
            const s = window.getSelection()
            s?.removeAllRanges()
            s?.addRange(r)
          } else {
            // Empty block — place at start
            const r = document.createRange()
            r.setStart(el, 0)
            r.collapse(true)
            const s = window.getSelection()
            s?.removeAllRanges()
            s?.addRange(r)
          }
        } catch { }
      }, 0)

      return true
    }
  }, [note.blocks, onChange, note.id, pushHistory])

  // Called by BlockItem's grip/margin onMouseDown
  function startDragSelect(blockId: string, blockIdx: number) {
    isDraggingRef.current = true
    dragAnchorIdxRef.current = blockIdx
      ; (document.activeElement as HTMLElement)?.blur()
    setFocusedBlockId(null)
    setSelectedBlockIds(new Set([blockId]))
    setLastSelectedIdx(blockIdx)
  }

  // Called by BlockItem's onMouseEnter while a drag is active
  function extendDragSelect(blockIdx: number) {
    if (!isDraggingRef.current || dragAnchorIdxRef.current === null) return
    const anchor = dragAnchorIdxRef.current
    const blocks = noteBlocksRef.current
    const [from, to] = anchor <= blockIdx ? [anchor, blockIdx] : [blockIdx, anchor]
    const ids = new Set<string>()
    for (let i = from; i <= to; i++) ids.add(blocks[i].id)
    setSelectedBlockIds(ids)
    setLastSelectedIdx(blockIdx)
  }

  // Stop drag on mouseup anywhere in the window
  useEffect(() => {
    function onMouseUp() { isDraggingRef.current = false }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  // ── Cross-block text drag-selection ─────────────────────────────────────────
  // Browsers can't drag-select text across separate contenteditable elements —
  // the selection gets trapped in whichever block the drag started in.
  // Fix: on mousedown inside a contenteditable, snapshot the anchor position;
  // on mousemove (button held), if the cursor has moved into a different block
  // extend the selection programmatically via setBaseAndExtent +
  // caretRangeFromPoint so the visual highlight spans all covered blocks.
  useEffect(() => {
    const state = {
      active: false,
      anchorNode: null as Node | null,
      anchorOffset: 0,
      anchorBlockEl: null as Element | null,
    }

    // Cross-browser helper: get the DOM node + offset under a viewport coordinate
    function caretAt(x: number, y: number): { node: Node; offset: number } | null {
      if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y)
        return r ? { node: r.startContainer, offset: r.startOffset } : null
      }
      // Firefox
      const pos = (document as any).caretPositionFromPoint?.(x, y)
      return pos ? { node: pos.offsetNode, offset: pos.offset } : null
    }

    function onMouseDown(e: MouseEvent) {
      state.active = false
      state.anchorNode = null

      const target = e.target as Element
      // Only activate for clicks that land directly inside a contenteditable
      if (!target.closest('[contenteditable]')) return
      // Ignore grip handles and other block-selection controls
      if (target.closest('[data-drag-handle]')) return

      const blockEl = target.closest('[data-block-id]')
      if (!blockEl) return

      // Snapshot where the drag begins using caretRangeFromPoint
      const caret = caretAt(e.clientX, e.clientY)
      if (!caret) return

      state.active = true
      state.anchorNode = caret.node
      state.anchorOffset = caret.offset
      state.anchorBlockEl = blockEl
    }

    function onMouseMove(e: MouseEvent) {
      if (e.buttons !== 1 || !state.active || !state.anchorNode) return

      const target = e.target as Element
      const targetBlockEl = target.closest('[data-block-id]')

      // Only intervene when the pointer has crossed into a different block
      if (!targetBlockEl || targetBlockEl === state.anchorBlockEl) return

      const caret = caretAt(e.clientX, e.clientY)
      if (!caret) return

      // Only extend into text blocks — skip date/divider that have no editable
      const inEditable = caret.node instanceof Element
        ? caret.node.closest('[contenteditable]')
        : (caret.node as Node).parentElement?.closest('[contenteditable]')
      if (!inEditable) return

      try {
        window.getSelection()?.setBaseAndExtent(
          state.anchorNode!, state.anchorOffset,
          caret.node, caret.offset
        )
      } catch { }
    }

    function onMouseUp() {
      state.active = false
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement as HTMLElement
      const isContentEditable = !!(activeEl?.contentEditable === 'true' || activeEl?.closest('[contenteditable]'))

      // ── Copied Blocks Cmd-C Cmd-V Navigation ────────────────────────────────
      // Cmd-Z Undo
      if (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        undoRef.current()
        return
      }

      // Cmd-Shift-Z / Ctrl-Shift-Z Redo
      if ((e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) || (e.key.toLowerCase() === 'y' && e.ctrlKey)) {
        e.preventDefault()
        redoRef.current()
        return
      }

      // Cmd-C Copy Selected Blocks
      if (e.key.toLowerCase() === 'c' && (e.metaKey || e.ctrlKey)) {
        if (selectedIdsRef.current.size > 0 && !isContentEditable) {
          e.preventDefault()
          const blocksToCopy = noteBlocksRef.current.filter(b => selectedIdsRef.current.has(b.id))
          const payload = JSON.stringify({ source: 'locus_blocks', blocks: blocksToCopy })
          navigator.clipboard.writeText(payload)
          toast({ description: `${blocksToCopy.length} blocks copied.` })
          return
        }
      }

      // ── Cross-block text-selection: Backspace / Delete ──────────────────────
      // Must run before the block-selection handler so text-editing wins when
      // the user has dragged a native text selection across multiple blocks.
      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey) {
        if (crossBlockDeleteRef.current()) {
          e.preventDefault()
          return
        }
      }

      // ── Cross-block text-selection: printable character replaces selection ──
      // A single printable key (no modifier) while a cross-block selection is
      // active should delete the selection and insert the typed character.
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (crossBlockDeleteRef.current(e.key)) {
          e.preventDefault()
          return
        }
      }

      // Delete / Backspace when blocks are selected — delete selected blocks
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdsRef.current.size > 0) {
        e.preventDefault()
        deleteSelectedBlocksRef.current()
        return
      }

      // Cmd/Ctrl + Backspace or Delete — delete selected blocks even while editing text
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete') && selectedIdsRef.current.size > 0) {
        e.preventDefault()
        deleteSelectedBlocksRef.current()
        return
      }

      // Escape — clear selection and exit editing
      if (e.key === 'Escape' && selectedIdsRef.current.size > 0) {
        e.preventDefault()
        setSelectedBlockIds(new Set())
        setLastSelectedIdx(null)
        if (isContentEditable) (activeEl as HTMLElement).blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // Clicking outside any block clears the selection
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (selectedIdsRef.current.size === 0) return
      const target = e.target as HTMLElement
      // Keep selection when clicking on a block or on selection-control UI (toolbar buttons)
      if (target.closest('[data-block-id]') || target.closest('[data-keep-selection]')) return
      setSelectedBlockIds(new Set())
      setLastSelectedIdx(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Paste handler for blocks
  useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      // Allow native pasting inside active inputs or contenteditables,
      // EXCEPT when we intercept a custom Locus blocks payload
      const text = e.clipboardData?.getData('text/plain') || ''
      try {
        const payload = JSON.parse(text)
        if (payload.source === 'locus_blocks' && Array.isArray(payload.blocks)) {
          e.preventDefault()
          const incomingBlocks = payload.blocks.map((b: Block) => cloneBlock(b))

          let insertIdx = note.blocks.findIndex(b => b.id === focusedBlockId)
          if (insertIdx === -1) {
            insertIdx = selectedIdsRef.current.size > 0
              ? note.blocks.findIndex(b => selectedIdsRef.current.has(b.id))
              : note.blocks.length - 1
          }

          const next = [...note.blocks.slice(0, insertIdx + 1), ...incomingBlocks, ...note.blocks.slice(insertIdx + 1)]
          pushHistory(note.blocks) // Push current state before change
          onChange(note.id, { blocks: next })
          setFocusedBlockId(incomingBlocks[incomingBlocks.length - 1].id)
          toast({ description: `${incomingBlocks.length} blocks pasted.` })
        }
      } catch {
        // Not our payload, let the browser paste normally
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [note.blocks, focusedBlockId, pushHistory, onChange, note.id])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Notes</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{note.title || 'Untitled'}</span>
          {selectedBlockIds.size > 0 && (
            <>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
              <Badge variant="secondary" className="gap-1.5">
                <span>{selectedBlockIds.size} selected</span>
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-2" data-keep-selection>
          {selectedBlockIds.size > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelectedBlockIds(new Set())
                  setLastSelectedIdx(null)
                }}
              >
                <X className="w-3.5 h-3.5" />
                Deselect
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => {
                      setFocusedBlockId(null)
                      deleteSelectedBlocks()
                    }}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {selectedBlockIds.size > 1 ? selectedBlockIds.size + ' blocks' : 'block'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Press Delete or Cmd+Backspace</TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(note.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete note</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-8 py-10 pb-24">
          {/* Emoji + Title */}
          <div className="mb-8 space-y-3">
            <div className="relative inline-block">
              <button
                className="text-5xl hover:bg-muted rounded-lg p-1 transition-colors leading-none"
                onClick={() => setShowEmojiPicker(p => !p)}
                title="Change emoji"
              >
                {note.emoji}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-popover border rounded-xl shadow-xl grid grid-cols-8 gap-1 w-max">
                  {NOTE_EMOJIS.map(em => (
                    <button key={em}
                      className={cn("w-10 h-10 flex items-center justify-center flex-shrink-0 overflow-hidden rounded hover:bg-accent transition-colors", em === note.emoji && 'bg-accent')}
                      style={{ fontSize: '22px', lineHeight: 1 }}
                      onClick={() => { onChange(note.id, { emoji: em }); setShowEmojiPicker(false) }}
                    >{em}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              ref={titleRef}
              value={note.title}
              onChange={e => onChange(note.id, { title: e.target.value })}
              placeholder="Untitled"
              className="w-full text-4xl font-bold tracking-tight bg-transparent outline-none placeholder:text-muted-foreground/40 border-none"
            />
            {/* Created / edited dates */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground/55 select-none -mt-1">
              <span>Created {formatDate(note.createdAt)}</span>
              <span>·</span>
              <span>Edited {formatDate(note.updatedAt)}</span>
            </div>
          </div>

          {/* Blocks */}
          <FormatToolbar />
          <div className="space-y-0">
            {note.blocks.map((block, index) => {
              // For numbered blocks, count how many consecutive numbered blocks
              // precede this one so the list always starts at 1.
              let listIndex = 0
              if (block.type === 'numbered') {
                for (let i = index - 1; i >= 0; i--) {
                  if (note.blocks[i].type === 'numbered') listIndex++
                  else break
                }
              }
              return (
                <BlockItem
                  key={block.id}
                  block={block}
                  index={index}
                  listIndex={listIndex}
                  numBlocks={note.blocks.length}
                  isFocused={focusedBlockId === block.id}
                  isSelected={selectedBlockIds.has(block.id)}
                  onUpdate={handleUpdateBlock}
                  onInsert={insertBlockAfter}
                  onDelete={deleteBlock}
                  onMergePrev={mergePrevBlock}
                  onDuplicate={(id) => {
                    const idx = note.blocks.findIndex(b => b.id === id)
                    if (idx === -1) return
                    const b = note.blocks[idx]
                    const newBlock: Block = { ...b, id: crypto.randomUUID() }
                    const newBlocks = [...note.blocks.slice(0, idx + 1), newBlock, ...note.blocks.slice(idx + 1)]
                    pushHistory(note.blocks) // Push current state before change
                    onChange(note.id, { blocks: newBlocks })
                    setFocusedBlockId(newBlock.id)
                  }}
                  onFocus={setFocusedBlockId}
                  onSelect={selectBlock}
                  onDragSelectStart={startDragSelect}
                  onMouseEnterBlock={extendDragSelect}
                  onPasteLines={insertPastedLines}
                  people={people}
                  onCreatePerson={onCreatePerson}
                  onNavigateTo={onNavigateTo}
                  objectTypes={objectTypes}
                  onCreateObjectType={onCreateObjectType}
                  onFocusPrev={focusPrevBlock}
                  onFocusNext={focusNextBlock}
                  onReorderDragStart={startReorderDrag}
                  isBeingDragged={reorderDragId === block.id}
                  showDropIndicatorAbove={reorderDropIdx === index}
                />
              )
            })}
          </div>

          {/* Drop indicator after last block */}
          {reorderDropIdx === note.blocks.length && (
            <div className="h-0.5 bg-primary rounded-full mx-7 mt-0.5 pointer-events-none" />
          )}

          {/* Add block button */}
          <button
            className="mt-4 ml-7 flex items-center gap-2 text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors group"
            onClick={() => {
              const nb = mkBlock('p')
              pushHistory(note.blocks)
              onChange(note.id, { blocks: [...note.blocks, nb] })
              setFocusedBlockId(nb.id)
            }}
          >
            <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
            <span>Add block</span>
          </button>

          {/* Tags section */}
          <div className="mt-10 pt-6 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {note.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1 pl-2 text-xs font-normal">
                  <span style={{ color: note.color }} className="opacity-80">#</span>
                  {tag}
                  <button className="ml-1 hover:text-destructive transition-colors rounded-sm" onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <div className="relative">
                <input
                  value={tagInput}
                  onChange={e => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add tag…"
                  className="h-6 px-2 text-xs bg-muted/50 rounded border border-transparent focus:border-input outline-none placeholder:text-muted-foreground/40 w-28 focus:w-40 transition-all"
                />
                {tagSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden min-w-[140px]">
                    {tagSuggestions.map(t => (
                      <button key={t}
                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-1.5"
                        onMouseDown={e => { e.preventDefault(); addTag(t) }}
                      >
                        <Hash className="w-3 h-3 text-muted-foreground" />{t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground/60">
              Press Enter or comma to add · Notes sharing tags connect in the graph
            </p>
          </div>

          {/* Meta */}
          <div className="mt-6 flex gap-4 text-[10px] text-muted-foreground/60">
            <span>Created {new Date(note.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ notes, activeId, search, onSearch, onSelect, onCreate, activeTag, onTagFilter, people, onDeletePerson, objectTypes, onCreateObjectType }: {
  notes: Note[]; activeId: string | null; search: string; onSearch: (q: string) => void
  onSelect: (id: string) => void; onCreate: () => void; activeTag: string | null; onTagFilter: (tag: string | null) => void
  people: Person[]; onDeletePerson: (id: string) => void
  objectTypes: ObjectType[]; onCreateObjectType: (name: string, emoji: string) => void
}) {
  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    notes.forEach(n => n.tags.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [notes])

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Locus Notes</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCreate}>
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New note</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-8 h-8 text-xs bg-background/70" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Notes list */}
        <div className="p-2 space-y-0.5">
          {notes.map(note => (
            <button key={note.id}
              onClick={() => onSelect(note.id)}
              className={cn(
                "w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 group transition-colors",
                note.id === activeId
                  ? 'bg-background shadow-sm ring-1 ring-border'
                  : 'hover:bg-background/80'
              )}
            >
              <span className="text-base leading-none mt-0.5 flex-shrink-0">{note.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{note.title || 'Untitled'}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {note.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] text-muted-foreground font-mono font-medium">#{tag}</span>
                  ))}
                  {note.tags.length > 3 && <span className="text-[10px] text-muted-foreground/70">+{note.tags.length - 3}</span>}
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: note.color }} />
            </button>
          ))}
          {notes.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
              No notes found
            </div>
          )}
        </div>

        {/* Objects section — built-in types always visible, custom types when populated */}
        {(() => {
          const allTypes = [...BUILTIN_OBJECT_TYPES, ...objectTypes]
          // Built-in types always shown; custom types only if they have objects
          const visibleTypes = allTypes.filter(t =>
            t.isBuiltin || people.some(p => (p.typeId ?? 'person') === t.id)
          )
          if (visibleTypes.length === 0) return null
          return (
            <div className="px-3 pt-2 pb-2 border-t mt-2 space-y-3">
              {visibleTypes.map(objType => {
                const typeObjects = people.filter(p => (p.typeId ?? 'person') === objType.id)
                return (
                  <div key={objType.id}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] leading-none">{objType.emoji}</span>
                      <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider flex-1">{objType.name}</span>
                      {typeObjects.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/40 tabular-nums">{typeObjects.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {typeObjects.map(person => (
                        <div key={person.id} className="group/person flex items-center gap-0.5">
                          <button
                            onClick={() => person.noteId && onSelect(person.noteId)}
                            className={cn(
                              "flex-1 min-w-0 text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm",
                              person.noteId && activeId === person.noteId
                                ? 'bg-background shadow-sm ring-1 ring-border'
                                : 'hover:bg-background/80 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <span className="text-sm leading-none flex-shrink-0">{person.emoji}</span>
                            <span className="truncate">{person.name}</span>
                          </button>
                          <button
                            onClick={() => onDeletePerson(person.id)}
                            className="opacity-0 group-hover/person:opacity-100 transition-opacity p-1 rounded hover:text-destructive text-muted-foreground/40 flex-shrink-0"
                            title={`Remove ${objType.name.toLowerCase()}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {typeObjects.length === 0 && (
                        <div className="px-2 py-0.5 text-[11px] text-muted-foreground/35 italic">
                          No {objType.name.toLowerCase()}s yet
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Tag cloud */}
        {allTags.length > 0 && (
          <div className="px-3 pt-2 pb-3 border-t mt-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">Tags</span>
              {activeTag && (
                <button onClick={() => onTagFilter(null)}
                  className="ml-auto text-[9px] text-primary hover:underline">clear</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => {
                const count = notes.filter(n => n.tags.includes(tag)).length
                return (
                  <button key={tag}
                    onClick={() => onTagFilter(activeTag === tag ? null : tag)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border transition-colors font-mono",
                      activeTag === tag
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background/60 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    #{tag} <span className="opacity-60">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <p className="text-[10px] text-muted-foreground/50 text-center">Locus Notes</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [graphOpen, setGraphOpen] = useState(true)
  const [graphExpanded, setGraphExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [customObjectTypes, setCustomObjectTypes] = useState<ObjectType[]>([])

  useEffect(() => {
    const loaded = loadNotes().map(n => ({ ...n, blocks: normalizeBlocks(n.blocks) }))
    setNotes(loaded)
    if (loaded.length > 0) setActiveId(loaded[0].id)
    setPeople(loadPeople())
    setCustomObjectTypes(loadObjectTypes())
    setMounted(true)
  }, [])

  // Auto-save notes
  useEffect(() => {
    if (mounted) saveNotes(notes)
  }, [notes, mounted])

  // Auto-save people
  useEffect(() => {
    if (mounted) savePeople(people)
  }, [people, mounted])

  // Auto-save custom object types
  useEffect(() => {
    if (mounted) saveObjectTypes(customObjectTypes)
  }, [customObjectTypes, mounted])

  function deletePerson(personId: string) {
    const person = people.find(p => p.id === personId)
    if (person?.noteId) {
      setNotes(prev => {
        const rest = prev.filter(n => n.id !== person.noteId)
        if (activeId === person.noteId) setActiveId(rest[0]?.id ?? null)
        return rest
      })
    }
    setPeople(prev => prev.filter(p => p.id !== personId))
  }

  function createObjectType(name: string, emoji: string): ObjectType {
    const newType: ObjectType = { id: crypto.randomUUID(), name, emoji }
    setCustomObjectTypes(prev => [...prev, newType])
    return newType
  }

  function createPerson(name: string, typeId: string = 'person'): Person {
    // Create a dedicated note for this person
    const allTypes = [...BUILTIN_OBJECT_TYPES, ...customObjectTypes]
    const objType = allTypes.find(t => t.id === typeId)
    const noteEmoji = objType?.emoji ?? PERSON_EMOJIS[Math.floor(Math.random() * PERSON_EMOJIS.length)]
    const personNote: Note = {
      ...mkNote(),
      title: name,
      emoji: noteEmoji,
      blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
      tags: [],
    }
    const person: Person = { ...mkPerson(name), noteId: personNote.id, typeId }
      // Store personId on the note so we can identify it as a person page
      ; (personNote as any).personId = person.id
    setNotes(prev => [personNote, ...prev])
    setPeople(prev => [...prev, person])
    return person
  }

  const filteredNotes = useMemo(() => {
    let result = notes
    if (activeTag) result = result.filter(n => n.tags.includes(activeTag))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.blocks.some(b => b.content.toLowerCase().includes(q)) ||
        n.tags.some(t => t.includes(q))
      )
    }
    return result
  }, [notes, search, activeTag])

  const activeNote = notes.find(n => n.id === activeId) ?? null

  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => set.add(t)))
    return [...set]
  }, [notes])

  function createNote() {
    const note = mkNote()
    setNotes(prev => [note, ...prev])
    setActiveId(note.id)
    setSearch('')
    setActiveTag(null)
  }

  function updateNote(id: string, patch: Partial<Note>) {
    // When a person-linked note's title changes, propagate rename to all @mentions
    if (patch.title !== undefined) {
      const personForNote = people.find(p => p.noteId === id)
      if (personForNote && patch.title !== personForNote.name) {
        const oldName = personForNote.name
        const newName = patch.title
        // Update the person's stored name
        setPeople(prev => prev.map(p => p.id === personForNote.id ? { ...p, name: newName } : p))
        // Replace @OldName with @NewName in every note's block content
        const escOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const mentionRe = new RegExp('@' + escOld, 'g')
        setNotes(prev => prev.map(n => ({
          ...n,
          ...(n.id === id ? patch : {}),
          blocks: n.blocks.map(b => ({
            ...b,
            content: b.content.replace(mentionRe, '@' + newName),
            ...(b.expandedContent != null
              ? { expandedContent: b.expandedContent.replace(mentionRe, '@' + newName) }
              : {}),
          })),
          updatedAt: Date.now(),
        })))
        return
      }
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
  }

  function deleteNote(id: string) {
    setNotes(prev => {
      const rest = prev.filter(n => n.id !== id)
      if (activeId === id) setActiveId(rest[0]?.id ?? null)
      return rest
    })
  }

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* Sidebar toggle (mobile/collapsed) */}
        <button
          className={cn(
            "fixed left-0 top-1/2 -translate-y-1/2 z-50 w-5 h-12 bg-border/60 hover:bg-muted rounded-r-md flex items-center justify-center transition-all",
            sidebarOpen ? 'left-[240px]' : 'left-0'
          )}
          onClick={() => setSidebarOpen(p => !p)}
        >
          {sidebarOpen
            ? <PanelLeftClose className="w-3 h-3 text-muted-foreground" />
            : <PanelLeftOpen className="w-3 h-3 text-muted-foreground" />}
        </button>

        {/* Sidebar */}
        <div className={cn(
          "flex-shrink-0 transition-all duration-200 overflow-hidden",
          sidebarOpen ? 'w-60' : 'w-0'
        )}>
          <div className="w-60 h-full">
            <Sidebar
              notes={filteredNotes}
              activeId={activeId}
              search={search}
              onSearch={setSearch}
              onSelect={id => { setActiveId(id); setSearch('') }}
              onCreate={createNote}
              activeTag={activeTag}
              onTagFilter={setActiveTag}
              people={people}
              onDeletePerson={deletePerson}
              objectTypes={customObjectTypes}
              onCreateObjectType={createObjectType}
            />
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Top toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={graphOpen ? 'secondary' : 'ghost'} size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setGraphOpen(p => !p)}>
                    <Network className="w-3.5 h-3.5" />
                    Graph
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle tag network graph</TooltipContent>
              </Tooltip>
              <ThemeSwitcher />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Note editor */}
            <div className="flex-1 overflow-hidden">
              {activeNote ? (
                <NoteEditor
                  key={activeNote.id}
                  note={activeNote}
                  allTags={allTags}
                  onChange={updateNote}
                  onDelete={deleteNote}
                  people={people}
                  onCreatePerson={createPerson}
                  onNavigateTo={id => setActiveId(id)}
                  objectTypes={customObjectTypes}
                  onCreateObjectType={createObjectType}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <BookOpen className="w-12 h-12 opacity-20" />
                  <div className="text-center">
                    <p className="font-medium">No note selected</p>
                    <p className="text-sm mt-1 opacity-60">Select a note from the sidebar or create a new one</p>
                  </div>
                  <Button onClick={createNote} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> New note
                  </Button>
                </div>
              )}
            </div>

            {/* Graph panel */}
            <div className={cn(
              "flex-shrink-0 border-l transition-all duration-300 overflow-hidden",
              !graphOpen ? 'w-0' : graphExpanded ? 'w-[580px]' : 'w-80'
            )}>
              <div className={cn("h-full transition-all duration-300", graphExpanded ? 'w-[580px]' : 'w-80')}>
                <GraphPanel
                  notes={notes}
                  people={people}
                  activeNoteId={activeId}
                  onSelectNote={id => setActiveId(id)}
                  isExpanded={graphExpanded}
                  onToggleExpand={() => setGraphExpanded(p => !p)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
