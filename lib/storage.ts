import { Folder, ObjectType, Person, Note, Block, BlockType, TreeItem, NoteProperty, PropertyType, InboxItem } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SEED_NOTES, SEED_PEOPLE, NOTE_COLORS } from './constants'

// ─── Supabase row shapes (snake_case, as returned by Postgres) ─────────────────

interface DbNote {
    id: string
    user_id: string
    title: string
    emoji: string
    color: string
    blocks: Block[]
    tags: string[]
    properties: NoteProperty[]
    created_at: number
    updated_at: number
    person_id: string | null
    folder_id: string | null
    trashed_at: number | null
    note_type: Note['noteType'] | null
    due_date: string | null
    last_viewed: string | null
}

interface DbPerson {
    id: string
    user_id: string
    name: string
    emoji: string
    note_id: string | null
    type_id: string | null
}

interface DbFolder {
    id: string
    user_id: string
    name: string
    emoji: string
    parent_id: string | null
    created_at: number
}

interface DbObjectType {
    id: string
    user_id: string
    name: string
    emoji: string
    is_builtin: boolean
}

interface DbInboxItem {
    id: string
    user_id: string
    note_id: string
    type: InboxItem['type']
    subject: string
    sender: string
    preview: string
    timestamp: string
    read: boolean
}

interface DbDeletedObjectType {
    user_id: string
    type_id: string
}

export const STORAGE_KEY = 'locus-notes-v1'
export const PEOPLE_STORAGE_KEY = 'locus-people-v1'
export const OBJECT_TYPES_KEY = 'locus-object-types-v1'
export const DELETED_TYPES_KEY = 'locus-deleted-types-v1'
export const FOLDERS_STORAGE_KEY = 'locus-folders-v1'
export const INBOX_STORAGE_KEY = 'locus-inbox'

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
    if (typeof window === 'undefined') return SEED_PEOPLE
    try {
        const raw = localStorage.getItem(PEOPLE_STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch { }
    return SEED_PEOPLE
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
            value: type === 'checkbox' ? false : (type === 'multi_select' || type === 'person') ? [] : null,
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

// ── Inbox ─────────────────────────────────────────────────────────────────────

export function loadInbox(): InboxItem[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(INBOX_STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch {}
    return []
}

export function saveInbox(items: InboxItem[]) {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(items)) } catch {}
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

// ─── Supabase type mappers ─────────────────────────────────────────────────────
// These convert between our camelCase TypeScript types and Supabase's snake_case columns.

export function noteToDb(n: Note, userId: string) {
    return {
        id:          n.id,
        user_id:     userId,
        title:       n.title,
        emoji:       n.emoji,
        color:       n.color,
        blocks:      n.blocks,
        tags:        n.tags,
        properties:  n.properties ?? [],
        created_at:  n.createdAt,
        updated_at:  n.updatedAt,
        person_id:   n.personId   ?? null,
        folder_id:   n.folderId   ?? null,
        trashed_at:  n.trashedAt  ?? null,
        note_type:   n.noteType   ?? null,
        due_date:    n.dueDate    ?? null,
        last_viewed: n.lastViewed ?? null,
    }
}

export function noteFromDb(row: DbNote): Note {
    return {
        id:         row.id,
        title:      row.title,
        emoji:      row.emoji,
        color:      row.color,
        blocks:     row.blocks      ?? [],
        tags:       row.tags        ?? [],
        properties: row.properties  ?? [],
        createdAt:  row.created_at,
        updatedAt:  row.updated_at,
        personId:   row.person_id   ?? undefined,
        folderId:   row.folder_id   ?? undefined,
        trashedAt:  row.trashed_at  ?? undefined,
        noteType:   row.note_type   ?? undefined,
        dueDate:    row.due_date    ?? undefined,
        lastViewed: row.last_viewed ?? undefined,
    }
}

export function personToDb(p: Person, userId: string) {
    return {
        id:      p.id,
        user_id: userId,
        name:    p.name,
        emoji:   p.emoji,
        note_id: p.noteId  ?? null,
        type_id: p.typeId  ?? null,
    }
}

export function personFromDb(row: DbPerson): Person {
    return {
        id:     row.id,
        name:   row.name,
        emoji:  row.emoji,
        noteId: row.note_id ?? undefined,
        typeId: row.type_id ?? undefined,
    }
}

export function folderToDb(f: Folder, userId: string) {
    return {
        id:         f.id,
        user_id:    userId,
        name:       f.name,
        emoji:      f.emoji,
        parent_id:  f.parentId  ?? null,
        created_at: f.createdAt,
    }
}

export function folderFromDb(row: DbFolder): Folder {
    return {
        id:        row.id,
        name:      row.name,
        emoji:     row.emoji,
        parentId:  row.parent_id ?? null,
        createdAt: row.created_at,
    }
}

export function objectTypeToDb(t: ObjectType, userId: string) {
    return {
        id:         t.id,
        user_id:    userId,
        name:       t.name,
        emoji:      t.emoji,
        is_builtin: t.isBuiltin ?? false,
    }
}

export function objectTypeFromDb(row: DbObjectType): ObjectType {
    return {
        id:        row.id,
        name:      row.name,
        emoji:     row.emoji,
        isBuiltin: row.is_builtin ?? false,
    }
}

export function inboxItemToDb(i: InboxItem, userId: string) {
    return {
        id:        i.id,
        user_id:   userId,
        note_id:   i.noteId,
        type:      i.type,
        subject:   i.subject,
        sender:    i.sender,
        preview:   i.preview,
        timestamp: i.timestamp,
        read:      i.read,
    }
}

export function inboxItemFromDb(row: DbInboxItem): InboxItem {
    return {
        id:        row.id,
        noteId:    row.note_id,
        type:      row.type,
        subject:   row.subject,
        sender:    row.sender,
        preview:   row.preview,
        timestamp: row.timestamp,
        read:      row.read,
    }
}

// ─── Supabase async CRUD ───────────────────────────────────────────────────────

// ── Notes ──────────────────────────────────────────────────────────────────────

export async function dbLoadNotes(supabase: SupabaseClient, userId: string): Promise<Note[]> {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(noteFromDb)
}

export async function dbUpsertNote(supabase: SupabaseClient, note: Note, userId: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .upsert(noteToDb(note, userId), { onConflict: 'id' })
    if (error) console.warn('[db] upsertNote error:', error.message)
}

export async function dbUpsertNotes(supabase: SupabaseClient, notes: Note[], userId: string): Promise<void> {
    if (notes.length === 0) return
    const { error } = await supabase
        .from('notes')
        .upsert(notes.map(n => noteToDb(n, userId)), { onConflict: 'id' })
    if (error) console.warn('[db] upsertNotes error:', error.message)
}

export async function dbDeleteNote(supabase: SupabaseClient, noteId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', userId)
    if (error) console.warn('[db] deleteNote error:', error.message)
}

// ── People ─────────────────────────────────────────────────────────────────────

export async function dbLoadPeople(supabase: SupabaseClient, userId: string): Promise<Person[]> {
    const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map(personFromDb)
}

export async function dbSyncPeople(
    supabase: SupabaseClient,
    people: Person[],
    prevPeople: Person[],
    userId: string
): Promise<void> {
    const changed = people.filter(p => {
        const prev = prevPeople.find(pp => pp.id === p.id)
        return (
            !prev ||
            prev.name   !== p.name   ||
            prev.emoji  !== p.emoji  ||
            prev.noteId !== p.noteId ||
            prev.typeId !== p.typeId
        )
    })
    const removed = prevPeople.filter(pp => !people.some(p => p.id === pp.id))
    if (changed.length > 0) {
        const { error } = await supabase
            .from('people')
            .upsert(changed.map(p => personToDb(p, userId)), { onConflict: 'id' })
        if (error) console.warn('[db] syncPeople upsert error:', error.message)
    }
    if (removed.length > 0) {
        const { error } = await supabase
            .from('people')
            .delete()
            .in('id', removed.map(p => p.id))
        if (error) console.warn('[db] syncPeople delete error:', error.message)
    }
}

// ── Folders ────────────────────────────────────────────────────────────────────

export async function dbLoadFolders(supabase: SupabaseClient, userId: string): Promise<Folder[]> {
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map(folderFromDb)
}

export async function dbSyncFolders(
    supabase: SupabaseClient,
    folders: Folder[],
    prevFolders: Folder[],
    userId: string
): Promise<void> {
    const changed = folders.filter(f => {
        const prev = prevFolders.find(pf => pf.id === f.id)
        return (
            !prev ||
            prev.name     !== f.name     ||
            prev.emoji    !== f.emoji    ||
            prev.parentId !== f.parentId
        )
    })
    const removed = prevFolders.filter(pf => !folders.some(f => f.id === pf.id))
    if (changed.length > 0) {
        const { error } = await supabase
            .from('folders')
            .upsert(changed.map(f => folderToDb(f, userId)), { onConflict: 'id' })
        if (error) console.warn('[db] syncFolders upsert error:', error.message)
    }
    if (removed.length > 0) {
        const { error } = await supabase
            .from('folders')
            .delete()
            .in('id', removed.map(f => f.id))
        if (error) console.warn('[db] syncFolders delete error:', error.message)
    }
}

// ── Object Types ───────────────────────────────────────────────────────────────

export async function dbLoadObjectTypes(supabase: SupabaseClient, userId: string): Promise<ObjectType[]> {
    const { data, error } = await supabase
        .from('object_types')
        .select('*')
        .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map(objectTypeFromDb)
}

export async function dbSyncObjectTypes(
    supabase: SupabaseClient,
    types: ObjectType[],
    prevTypes: ObjectType[],
    userId: string
): Promise<void> {
    const changed = types.filter(t => {
        const prev = prevTypes.find(pt => pt.id === t.id)
        return (
            !prev ||
            prev.name      !== t.name      ||
            prev.emoji     !== t.emoji     ||
            prev.isBuiltin !== t.isBuiltin
        )
    })
    const removed = prevTypes.filter(pt => !types.some(t => t.id === pt.id))
    if (changed.length > 0) {
        const { error } = await supabase
            .from('object_types')
            .upsert(changed.map(t => objectTypeToDb(t, userId)), { onConflict: 'id' })
        if (error) console.warn('[db] syncObjectTypes upsert error:', error.message)
    }
    if (removed.length > 0) {
        const { error } = await supabase
            .from('object_types')
            .delete()
            .in('id', removed.map(t => t.id))
        if (error) console.warn('[db] syncObjectTypes delete error:', error.message)
    }
}

// ── Deleted Object Types ───────────────────────────────────────────────────────

export async function dbLoadDeletedObjectTypes(supabase: SupabaseClient, userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('deleted_object_types')
        .select('type_id')
        .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map((row: Pick<DbDeletedObjectType, 'type_id'>) => row.type_id)
}

export async function dbSyncDeletedObjectTypes(
    supabase: SupabaseClient,
    typeIds: string[],
    prevTypeIds: string[],
    userId: string
): Promise<void> {
    const added   = typeIds.filter(id => !prevTypeIds.includes(id))
    const removed = prevTypeIds.filter(id => !typeIds.includes(id))
    if (added.length > 0) {
        const { error } = await supabase
            .from('deleted_object_types')
            .upsert(added.map(type_id => ({ user_id: userId, type_id })))
        if (error) console.warn('[db] syncDeletedObjectTypes upsert error:', error.message)
    }
    if (removed.length > 0) {
        const { error } = await supabase
            .from('deleted_object_types')
            .delete()
            .eq('user_id', userId)
            .in('type_id', removed)
        if (error) console.warn('[db] syncDeletedObjectTypes delete error:', error.message)
    }
}

// ── Inbox ──────────────────────────────────────────────────────────────────────

export async function dbLoadInbox(supabase: SupabaseClient, userId: string): Promise<InboxItem[]> {
    const { data, error } = await supabase
        .from('inbox')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
    if (error) throw error
    return (data ?? []).map(inboxItemFromDb)
}

export async function dbSyncInbox(
    supabase: SupabaseClient,
    items: InboxItem[],
    prevItems: InboxItem[],
    userId: string
): Promise<void> {
    const changed = items.filter(i => {
        const prev = prevItems.find(pi => pi.id === i.id)
        return (
            !prev ||
            prev.read      !== i.read      ||
            prev.subject   !== i.subject   ||
            prev.preview   !== i.preview   ||
            prev.timestamp !== i.timestamp ||
            prev.type      !== i.type
        )
    })
    const removed = prevItems.filter(pi => !items.some(i => i.id === pi.id))
    if (changed.length > 0) {
        const { error } = await supabase
            .from('inbox')
            .upsert(changed.map(i => inboxItemToDb(i, userId)), { onConflict: 'id' })
        if (error) console.warn('[db] syncInbox upsert error:', error.message)
    }
    if (removed.length > 0) {
        const { error } = await supabase
            .from('inbox')
            .delete()
            .in('id', removed.map(i => i.id))
        if (error) console.warn('[db] syncInbox delete error:', error.message)
    }
}
