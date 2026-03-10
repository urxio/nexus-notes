export type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'bullet' | 'numbered' | 'quote' | 'code' | 'divider' | 'todo' | 'date' | 'toggle' | 'table'

// ── Page properties (Notion-style) ───────────────────────────────────────────

export type PropertyType =
    | 'text' | 'number' | 'date'
    | 'select' | 'multi_select'
    | 'checkbox' | 'url' | 'email' | 'phone' | 'person'

export interface PropertyOption {
    id: string
    label: string
    color: string   // hex color for the chip (e.g. '#3b82f6')
}

export interface NoteProperty {
    id: string
    name: string
    type: PropertyType
    /** string for text/url/email/phone/date(ISO)/select(optionId)/person(personId)
     *  number for number, boolean for checkbox, string[] for multi_select */
    value: string | number | boolean | string[] | null
    options?: PropertyOption[]  // for select / multi_select only
}

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
    properties?: NoteProperty[]
    createdAt: number
    updatedAt: number
    personId?: string
    folderId?: string | null
}

export interface Folder {
    id: string
    name: string
    emoji: string
    parentId: string | null
    createdAt: number
}

export type TreeItem =
    | { kind: 'folder'; folder: Folder; children: TreeItem[] }
    | { kind: 'note'; note: Note }

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

export interface GNode {
    id: string; type: 'note' | 'tag'; label: string; color: string
    emoji?: string; x: number; y: number; vx: number; vy: number; r: number; noteId?: string
}

export interface GEdge { source: string; target: string }
