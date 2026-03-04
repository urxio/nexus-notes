import {
  AlignLeft, Heading1, Heading2, Heading3, List, ListOrdered,
  Code2, Quote, CheckSquare, Minus, ChevronRight, Calendar,
} from "lucide-react"
import type { BlockType } from "./types"

// ─── Colors & Emojis ──────────────────────────────────────────────────────────

export const NOTE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']
export const NOTE_EMOJIS = ['📝', '💡', '🎯', '📚', '🔬', '🎨', '💻', '🌱', '⚡', '🔥', '📊', '🧠', '✨', '🚀', '🗒️', '📌']

// ─── Block Metadata ───────────────────────────────────────────────────────────

export const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
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

export const BLOCK_LABELS: Record<BlockType, string> = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', p: 'Paragraph',
  bullet: 'Bullet List', numbered: 'Numbered List', quote: 'Quote',
  code: 'Code Block', divider: 'Divider', todo: 'To-do', date: 'Date',
  toggle: 'Toggle', table: 'Table',
}

export const BLOCK_PLACEHOLDERS: Record<BlockType, string> = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  p: "Write something, or type '/' for commands…",
  bullet: 'List item', numbered: 'List item',
  quote: 'Quote…', code: 'Code…', divider: '', todo: 'To-do', date: '',
  toggle: 'Toggle header…', table: 'Table (use | to separate cells)…',
}

export const SLASH_MENU_ITEMS: { type: BlockType; label: string; shortcut?: string }[] = [
  { type: 'p',        label: 'Paragraph',    shortcut: '' },
  { type: 'h1',       label: 'Heading 1',    shortcut: '#' },
  { type: 'h2',       label: 'Heading 2',    shortcut: '##' },
  { type: 'h3',       label: 'Heading 3',    shortcut: '###' },
  { type: 'toggle',   label: 'Toggle',       shortcut: '>>' },
  { type: 'bullet',   label: 'Bullet List',  shortcut: '-' },
  { type: 'numbered', label: 'Numbered List',shortcut: '1.' },
  { type: 'quote',    label: 'Quote',        shortcut: '>' },
  { type: 'code',     label: 'Code Block',   shortcut: '```' },
  { type: 'table',    label: 'Table',        shortcut: 'table' },
  { type: 'todo',     label: 'To-do',        shortcut: '[]' },
  { type: 'divider',  label: 'Divider',      shortcut: '---' },
  { type: 'date',     label: 'Date',         shortcut: '' },
]
