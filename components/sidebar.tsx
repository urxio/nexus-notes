import React, { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { BookOpen, ChevronRight, FileText, FolderPlus, Search, Plus, Pencil, Trash2, X, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Note, Person, ObjectType, Folder, TreeItem } from "@/lib/types"
import { buildTree } from "@/lib/storage"
import { BUILTIN_OBJECT_TYPES } from "@/lib/constants"
import { NoteIcon } from "./note-icon"

interface SidebarProps {
    notes: Note[]        // filtered notes (flat search/tag view)
    allNotes: Note[]     // all notes (for folder tree)
    activeId: string | null
    search: string
    onSearch: (q: string) => void
    onSelect: (id: string) => void
    onCreate: () => void
    activeTag: string | null
    onTagFilter: (tag: string | null) => void
    people: Person[]
    onDeletePerson: (id: string) => void
    objectTypes: ObjectType[]
    deletedObjectTypes: string[]
    onPromptDeleteObjectType: (id: string) => void
    folders: Folder[]
    expandedFolders: Set<string>
    onToggleFolder: (id: string) => void
    onCreateFolder: (name?: string, parentId?: string | null) => void
    onRenameFolder: (id: string, name: string) => void
    onDeleteFolder: (id: string) => void
    onMoveNote: (noteId: string, folderId: string | null) => void
    onDeleteNote: (noteId: string) => void
    onDeleteTag: (tag: string) => void
}

export function Sidebar({ notes, allNotes, activeId, search, onSearch, onSelect, onCreate, activeTag, onTagFilter, people, onDeletePerson, objectTypes, deletedObjectTypes, onPromptDeleteObjectType, folders, expandedFolders, onToggleFolder, onCreateFolder, onRenameFolder, onDeleteFolder, onMoveNote, onDeleteNote, onDeleteTag }: SidebarProps) {
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: 'note' | 'person' | 'folder' | 'objectType'; id: string } | null>(null)
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')

    const allTags = useMemo(() => {
        const counts = new Map<string, number>()
        notes.forEach(n => n.tags.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)))
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
    }, [notes])

    // Use tree view when no search/tag filter is active
    const useTreeView = !search.trim() && !activeTag
    const treeItems = useMemo(
        () => useTreeView ? buildTree(folders, allNotes) : [],
        [folders, allNotes, useTreeView]
    )
    const allTypes = [...BUILTIN_OBJECT_TYPES, ...objectTypes].filter(t => !deletedObjectTypes.includes(t.id))

    function renderNoteItem(note: Note, depth: number) {
        return (
            <button key={note.id}
                onClick={() => onSelect(note.id)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'note', id: note.id }) }}
                style={{ paddingLeft: `${8 + depth * 14}px` }}
                className={cn(
                    "w-full text-left pr-2.5 py-2 rounded-lg flex items-start gap-2 group transition-colors",
                    note.id === activeId
                        ? 'bg-background shadow-sm ring-1 ring-border'
                        : 'hover:bg-background/80'
                )}
            >
                <span className="flex items-center justify-center w-5 h-5 mt-0.5 flex-shrink-0 text-stone-500">
                    <NoteIcon iconName={note.emoji} className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{note.title || 'Untitled'}</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {note.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] text-muted-foreground font-mono font-medium">#{tag}</span>
                        ))}
                        {note.tags.length > 3 && <span className="text-[10px] text-muted-foreground/70">+{note.tags.length - 3}</span>}
                    </div>
                </div>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: note.color }} />
            </button>
        )
    }

    function renderFolderRow(folder: Folder, children: TreeItem[], depth: number): React.ReactNode {
        const isOpen = expandedFolders.has(folder.id)
        const isEditing = editingFolderId === folder.id
        return (
            <div key={folder.id}>
                <div
                    style={{ paddingLeft: `${4 + depth * 14}px` }}
                    className="flex items-center gap-0.5 group/folder pr-1 py-1 rounded-md hover:bg-background/50"
                >
                    <button onClick={() => onToggleFolder(folder.id)}
                        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }) }}
                        className="flex items-center gap-1 flex-1 min-w-0">
                        <ChevronRight
                            className={cn("w-3 h-3 text-muted-foreground/60 transition-transform flex-shrink-0", isOpen && "rotate-90")}
                        />
                        <NoteIcon iconName="Folder" className="w-3.5 h-3.5 text-muted-foreground/60 transition-transform flex-shrink-0" />
                        {isEditing ? (
                            <input
                                autoFocus
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onBlur={() => { onRenameFolder(folder.id, editingName || folder.name); setEditingFolderId(null) }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') { onRenameFolder(folder.id, editingName || folder.name); setEditingFolderId(null) }
                                    if (e.key === 'Escape') setEditingFolderId(null)
                                    e.stopPropagation()
                                }}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 min-w-0 text-sm bg-background border border-primary/50 rounded px-1 py-0 outline-none"
                            />
                        ) : (
                            <span className="text-sm font-medium truncate">{folder.name}</span>
                        )}
                    </button>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                            onClick={() => onCreateFolder('New Folder', folder.id)}
                            title="New subfolder"
                            className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                            <FolderPlus className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => { setEditingFolderId(folder.id); setEditingName(folder.name) }}
                            title="Rename"
                            className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => onDeleteFolder(folder.id)}
                            title="Delete folder"
                            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                {isOpen && (
                    <div>{renderTree(children, depth + 1)}</div>
                )}
            </div>
        )
    }

    function renderTree(items: TreeItem[], depth = 0): React.ReactNode {
        return items.map(item =>
            item.kind === 'folder'
                ? renderFolderRow(item.folder, item.children, depth)
                : renderNoteItem(item.note, depth)
        )
    }

    return (
        <div className="flex flex-col h-full bg-muted/30 border-r">
            {/* Header */}
            <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Locus Notes</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onCreateFolder()}>
                                        <FolderPlus className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">New folder</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCreate}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">New note</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={search} onChange={e => onSearch(e.target.value)}
                        placeholder="Search notes…"
                        className="pl-8 h-8 text-xs bg-background/70" />
                </div>
            </div>

            <ScrollArea className="flex-1">
                {/* Notes / Tree list */}
                <div className="p-2 space-y-0.5">
                    {useTreeView ? (
                        <>
                            {treeItems.length === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                    No notes yet
                                </div>
                            ) : renderTree(treeItems)}
                        </>
                    ) : (
                        <>
                            {notes.map(note => renderNoteItem(note, 0))}
                            {notes.length === 0 && (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                    No notes found
                                </div>
                            )}
                        </>
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
                                        <div
                                            className="flex items-center gap-1.5 mb-1 cursor-context-menu"
                                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'objectType', id: objType.id }) }}
                                        >
                                            <NoteIcon iconName={objType.emoji} className="text-[11px] leading-none text-muted-foreground" />
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
                                                        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'person', id: person.id }) }}
                                                        className={cn(
                                                            "flex-1 min-w-0 text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm",
                                                            person.noteId && activeId === person.noteId
                                                                ? 'bg-background shadow-sm ring-1 ring-border'
                                                                : 'hover:bg-background/80 text-muted-foreground hover:text-foreground'
                                                        )}
                                                    >
                                                        <NoteIcon iconName={person.emoji} className="w-4 h-4 text-muted-foreground/60 leading-none flex-shrink-0" />
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
                                    <span key={tag} className="group relative inline-flex items-center">
                                        <button
                                            onClick={() => onTagFilter(activeTag === tag ? null : tag)}
                                            className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full border transition-colors font-mono pr-5",
                                                activeTag === tag
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background/60 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                                            )}
                                        >
                                            #{tag} <span className="opacity-60">{count}</span>
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); onDeleteTag(tag) }}
                                            title={`Delete #${tag} from all notes`}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                )}
            </ScrollArea>

            {/* ── Context menus live OUTSIDE ScrollArea so position:fixed is anchored
           to the true viewport, not a scroll-transformed container ── */}

            {/* Note context menu — right-click note → move to folder
           Rendered via portal into document.body so position:fixed is always
           viewport-relative with no ancestor CSS containment issues.
           Backdrop captures outside clicks via a plain React onClick — no
           document listeners, no refs, no React-18 timing edge-cases. */}
            {ctxMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
                    <div
                        className="fixed z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[190px] text-sm"
                        style={{ left: ctxMenu.x, top: ctxMenu.y }}
                    >
                        {ctxMenu.type === 'note' ? (
                            <>
                                <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Move to…</div>
                                <button
                                    onClick={() => { onMoveNote(ctxMenu.id, null); setCtxMenu(null) }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    Root (no folder)
                                </button>
                                {folders.map(folder => (
                                    <button
                                        key={folder.id}
                                        onClick={() => { onMoveNote(ctxMenu.id, folder.id); setCtxMenu(null) }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 transition-colors"
                                    >
                                        <NoteIcon iconName="Folder" className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                                        <span className="truncate">{folder.name}</span>
                                    </button>
                                ))}
                                {folders.length === 0 && (
                                    <div className="px-3 py-1.5 text-xs text-muted-foreground/50 italic">No folders yet</div>
                                )}
                                <div className="h-px bg-border my-1 mx-2" />
                                <button onClick={() => { onDeleteNote(ctxMenu.id); setCtxMenu(null) }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    Delete note
                                </button>
                            </>
                        ) : ctxMenu.type === 'person' ? (
                            <button onClick={() => { onDeletePerson(ctxMenu.id); setCtxMenu(null) }} className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete object
                            </button>
                        ) : ctxMenu.type === 'objectType' ? (
                            <button onClick={() => { onPromptDeleteObjectType(ctxMenu.id); setCtxMenu(null) }} className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete {allTypes.find(t => t.id === ctxMenu.id)?.name || 'type'}
                            </button>
                        ) : (
                            <button onClick={() => { onDeleteFolder(ctxMenu.id); setCtxMenu(null) }} className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete folder
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}

            {/* Footer */}
            <div className="p-3 border-t">
                <p className="text-[10px] text-muted-foreground/50 text-center">Locus Notes</p>
            </div>
        </div>
    )
}
