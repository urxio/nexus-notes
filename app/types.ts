// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'h1' | 'h2' | 'h3'
  | 'p' | 'bullet' | 'numbered'
  | 'quote' | 'code' | 'divider'
  | 'todo' | 'date' | 'toggle' | 'table'

export interface Block {
  id: string
  type: BlockType
  content: string
  checked?: boolean
  open?: boolean
  expandedContent?: string
}

export interface Note {
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

export interface Person {
  id: string
  name: string
  emoji: string
  noteId?: string
  typeId?: string
}

export interface ObjectType {
  id: string
  name: string
  emoji: string
  isBuiltin?: boolean
}

// Graph types
export interface GNode {
  id: string; type: 'note' | 'tag'; label: string; color: string; emoji?: string
  x: number; y: number; vx: number; vy: number; r: number; noteId?: string
}

export interface GEdge { source: string; target: string }
