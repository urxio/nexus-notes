import { Folder, ObjectType, Person, Note, Block, BlockType, TreeItem, NoteProperty, PropertyType } from './types'
import { SEED_NOTES, PERSON_EMOJIS, NOTE_ICON_KEYS, NOTE_COLORS } from './constants'

export const STORAGE_KEY = 'locus-notes-v1'
export const PEOPLE_STORAGE_KEY = 'locus-people-v1'
export const OBJECT_TYPES_KEY = 'locus-object-types-v1'
export const DELETED_TYPES_KEY = 'locus-deleted-types-v1'
export const FOLDERS_STORAGE_KEY = 'locus-folders-v1'

export function loadFolders(): Folder[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(FOLDERS_STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return []
}

export function saveFolders(folders: Folder[]) {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders)) } catch { }
}

export function buildTree(
    folders: Folder[],
    notes: Note[],
    parentId: string | null = null
): TreeItem[] {
    const items: TreeItem[] = []
    for (const folder of folders.filter(f => f.parentId === parentId)) {
        items.push({ kind: 'folder', folder, children: buildTree(folders, notes, folder.id) })
    }
    for (const note of notes.filter(n => (n.folderId ?? null) === parentId)) {
        items.push({ kind: 'note', note })
    }
    return items
}

export function loadObjectTypes(): ObjectType[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(OBJECT_TYPES_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return []
}

export function saveObjectTypes(types: ObjectType[]) {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(OBJECT_TYPES_KEY, JSON.stringify(types)) } catch { }
}

export function loadDeletedObjectTypes(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(DELETED_TYPES_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return []
}

export function saveDeletedObjectTypes(ids: string[]) {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(DELETED_TYPES_KEY, JSON.stringify(ids)) } catch { }
}

export function loadPeople(): Person[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(PEOPLE_STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return []
}

export function savePeople(people: Person[]) {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)) } catch { }
}

export function mkPerson(name: string, emoji: string = '👤'): Person {
    return {
        id: crypto.randomUUID(),
        name,
        emoji,
    }
}

export function loadNotes(): Note[] {
    if (typeof window === 'undefined') return SEED_NOTES
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return SEED_NOTES
}

export function saveNotes(notes: Note[]) {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) } catch { }
}

// ── Default properties per built-in object type ────────────────────────────────

export function defaultPropertiesForType(typeId: string): NoteProperty[] {
    function mkProp(name: string, type: PropertyType): NoteProperty {
        return {
            id: crypto.randomUUID(),
            name,
            type,
            value: type === 'checkbox' ? false : type === 'multi_select' ? [] : null,
        }
    }
    function mkSelect(name: string, opts: { label: string; color: string }[]): NoteProperty {
        return {
            id: crypto.randomUUID(),
            name,
            type: 'select',
            value: null,
            options: opts.map(o => ({ id: crypto.randomUUID(), label: o.label, color: o.color })),
        }
    }

    switch (typeId) {
        case 'person':
            return [
                mkProp('Role',     'text'),
                mkProp('Email',    'email'),
                mkProp('Phone',    'phone'),
                mkProp('Company',  'text'),
                mkProp('LinkedIn', 'url'),
            ]
        case 'task':
            return [
                mkSelect('Status', [
                    { label: 'Not Started', color: '#6b7280' },
                    { label: 'In Progress', color: '#3b82f6' },
                    { label: 'Done',        color: '#22c55e' },
                    { label: 'Blocked',     color: '#ef4444' },
                ]),
                mkSelect('Priority', [
                    { label: 'Low',    color: '#22c55e' },
                    { label: 'Medium', color: '#f59e0b' },
                    { label: 'High',   color: '#ef4444' },
                    { label: 'Urgent', color: '#8b5cf6' },
                ]),
                mkProp('Due Date',  'date'),
                mkProp('Assignee',  'person'),
            ]
        case 'project':
            return [
                mkSelect('Status', [
                    { label: 'Planning',   color: '#8b5cf6' },
                    { label: 'Active',     color: '#3b82f6' },
                    { label: 'On Hold',    color: '#f59e0b' },
                    { label: 'Completed',  color: '#22c55e' },
                ]),
                mkProp('Start Date', 'date'),
                mkProp('End Date',   'date'),
                mkProp('Owner',      'person'),
            ]
        case 'meeting':
            return [
                mkProp('Date',      'date'),
                mkSelect('Status', [
                    { label: 'Scheduled',   color: '#6b7280' },
                    { label: 'In Progress', color: '#3b82f6' },
                    { label: 'Done',        color: '#22c55e' },
                    { label: 'Cancelled',   color: '#ef4444' },
                ]),
                mkProp('Location',  'text'),
                mkProp('Attendees', 'person'),
            ]
        default:
            return []
    }
}

export function mkNote(emoji: string = 'FileText'): Note {
    return {
        id: crypto.randomUUID(),
        title: 'Untitled',
        emoji,
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
        tags: [],
        properties: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
}

export function mkBlock(type: BlockType = 'p'): Block {
    return { id: crypto.randomUUID(), type, content: '' }
}

export function cloneBlock(b: Block): Block {
    return { id: crypto.randomUUID(), type: b.type, content: b.content, expandedContent: b.expandedContent, checked: b.checked }
}

export function normalizeBlocks(blocks: Block[]): Block[] {
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
