import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Plus, PanelLeftClose, FileText, FolderPlus, Pencil, Trash2, X, Hash, Network, ChevronRight, RotateCcw, Mail, LogOut } from "lucide-react"

const DISCORD_URL = 'https://discord.gg/8kCf3Eht'

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.102.128 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    )
}
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Folder, Person, ObjectType, Note } from "@/lib/types"
import { BUILTIN_OBJECT_TYPES, FUTURISTIC_ICONS, NOTE_ICON_KEYS } from "@/lib/constants"
import { NoteIcon } from "./note-icon"

interface NavRailProps {
    folders: Folder[]
    selectedFolderId: string | null
    onSelectFolder: (id: string | null) => void
    people: Person[]
    objectTypes: ObjectType[]
    deletedObjectTypes: string[]
    onPromptDeleteObjectType: (id: string) => void
    onDeletePerson: (id: string) => void
    onCreatePerson: (name: string, typeId?: string) => void
    onCreateFolder: (name?: string) => void
    onDeleteFolder: (id: string) => void
    onRenameFolder: (id: string, name: string) => void
    onCreate: () => void
    activeId: string | null
    onSelect: (id: string) => void
    allTags: string[]
    activeTag: string | null
    onTagFilter: (tag: string | null) => void
    graphOpen: boolean
    onToggleGraph: () => void
    notes: Note[]
    onToggleSidebar?: () => void
    trashCount: number
    trashView: boolean
    onSelectTrash: () => void
    selectedObjectTypeId?: string | null
    onSelectObjectType?: (typeId: string) => void
    inboxView?: boolean
    inboxUnread?: number
    onSelectInbox?: () => void
    /** Called when user clicks Sign Out; omit to hide the button (e.g. offline mode) */
    onSignOut?: () => void
    onDeleteTag: (tag: string) => void
    onCreateObjectType?: (name: string, emoji: string) => void
    onUpdateObjectType?: (id: string, updates: { name?: string; emoji?: string }) => void
}

export function NavRail({ folders, selectedFolderId, onSelectFolder, people, objectTypes, deletedObjectTypes, onPromptDeleteObjectType, onDeletePerson, onCreatePerson, onCreateFolder, onDeleteFolder, onRenameFolder, onCreate, activeId, onSelect, allTags, activeTag, onTagFilter, graphOpen, onToggleGraph, notes, onToggleSidebar, trashCount, trashView, onSelectTrash, selectedObjectTypeId, onSelectObjectType, inboxView, inboxUnread, onSelectInbox, onSignOut, onDeleteTag, onCreateObjectType, onUpdateObjectType }: NavRailProps) {
    const { resolvedTheme } = useTheme()
    const dark = resolvedTheme !== 'light'
    const isTerminal = resolvedTheme === 'terminal'
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [creatingType, setCreatingType] = useState<string | null>(null)
    const [creatingName, setCreatingName] = useState('')
    const [creatingObjectType, setCreatingObjectType] = useState(false)
    const [newObjectTypeName, setNewObjectTypeName] = useState('')
    const [iconPickerTypeId, setIconPickerTypeId] = useState<string | null>(null)
    const iconPickerRef = React.useRef<HTMLDivElement>(null)
    // Track explicitly EXPANDED types. Empty set = all collapsed = correct default for new users.
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set()
        try {
            const raw = localStorage.getItem('locus-expanded-types-v1')
            if (raw) return new Set(JSON.parse(raw) as string[])
        } catch {}
        return new Set()  // default: all collapsed ✓
    })

    // Save synchronously inside the setter so localStorage is always in sync,
    // even if the component remounts before an async effect would have run.
    const toggleTypeExpanded = (typeId: string) => {
        setExpandedTypes(prev => {
            const next = new Set(prev)
            next.has(typeId) ? next.delete(typeId) : next.add(typeId)
            try {
                localStorage.setItem('locus-expanded-types-v1', JSON.stringify([...next]))
            } catch {}
            return next
        })
    }
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: 'person' | 'folder' | 'objectType'; id: string } | null>(null)
    const allTypes = [...BUILTIN_OBJECT_TYPES, ...objectTypes].filter(t => !deletedObjectTypes.includes(t.id))
    // Built-in types always shown; custom types always shown (user created them intentionally)
    const visibleTypes = allTypes

    // Close icon picker on outside click
    useEffect(() => {
        if (!iconPickerTypeId) return
        function handler(e: MouseEvent) {
            if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) setIconPickerTypeId(null)
        }
        window.addEventListener('mousedown', handler)
        return () => window.removeEventListener('mousedown', handler)
    }, [iconPickerTypeId])

    return (
        <div className="flex flex-col h-full"
            style={{
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                background: isTerminal ? 'rgba(16,16,16,0.92)' : dark ? 'rgba(10,10,22,0.55)' : 'rgba(255,255,255,0.42)',
            }}
        >
            {/* Identity header */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Locus Logo" className="w-8 h-8 rounded-[10px] shadow-sm flex-shrink-0" />
                        <div>
                            <p className="font-bold text-[13px] text-[#1a1a2e] dark:text-zinc-100 leading-none tracking-tight">Locus</p>
                            <p className="text-[10px] text-[#9ca3af] dark:text-zinc-500 mt-0.5">Notes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {onToggleSidebar && (
                            <button onClick={onToggleSidebar} title="Close sidebar"
                                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center transition-all">
                                <PanelLeftClose className="w-3.5 h-3.5 text-[#9ca3af] dark:text-zinc-500 transition-colors" />
                            </button>
                        )}
                        <button onClick={onCreate} title="New note"
                            className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-zinc-800 hover:bg-indigo-100 dark:hover:bg-zinc-700 border border-indigo-100 dark:border-zinc-700 flex items-center justify-center transition-all group">
                            <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                        </button>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-3 pb-4 space-y-0.5">
                    {/* Inbox */}
                    <button
                        onClick={onSelectInbox}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all text-left",
                            inboxView
                                ? "bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-zinc-100 font-semibold"
                                : "text-[#374151] dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-[#1a1a2e] dark:hover:text-zinc-200"
                        )}
                    >
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                            inboxView ? "bg-indigo-100 dark:bg-indigo-950/50" : "bg-slate-100 dark:bg-zinc-700/60"
                        )}>
                            <Mail className={cn("w-3.5 h-3.5 transition-colors",
                                inboxView ? "text-indigo-600 dark:text-indigo-400" : "text-[#9ca3af] dark:text-zinc-500"
                            )} />
                        </div>
                        <span className="flex-1 text-[13px]">Inbox</span>
                        {(inboxUnread ?? 0) > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex-shrink-0">
                                {inboxUnread}
                            </span>
                        ) : null}
                    </button>

                    {/* All Notes */}
                    <button
                        onClick={() => { onSelectFolder(null); onTagFilter(null) }}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all text-left",
                            selectedFolderId === null && !activeTag
                                ? "bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-zinc-100 font-semibold"
                                : "text-[#374151] dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-[#1a1a2e] dark:hover:text-zinc-200"
                        )}
                    >
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                            selectedFolderId === null && !activeTag ? "bg-indigo-100 dark:bg-indigo-950/50" : "bg-slate-100 dark:bg-zinc-700/60"
                        )}>
                            <FileText className={cn("w-3.5 h-3.5 transition-colors",
                                selectedFolderId === null && !activeTag ? "text-indigo-600 dark:text-indigo-400" : "text-[#9ca3af] dark:text-zinc-500"
                            )} />
                        </div>
                        <span className="flex-1 text-[13px]">All Notes</span>
                        <span className="text-[10px] font-mono text-[#9ca3af] dark:text-zinc-500 tabular-nums">{notes.length}</span>
                    </button>

                    {/* Folders */}
                    <div className="pt-4">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span className="font-mono font-bold text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] dark:text-zinc-500">Folders</span>
                            </div>
                            <button onClick={() => onCreateFolder()} title="New folder"
                                className="text-[#9ca3af] hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors">
                                <FolderPlus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="space-y-0.5">
                            {folders.filter(f => f.parentId === null).map(folder => {
                                const count = notes.filter(n => (n.folderId ?? null) === folder.id).length
                                const isSelected = selectedFolderId === folder.id
                                const isEditing = editingFolderId === folder.id
                                return (
                                    <div key={folder.id} className="group/folder flex items-center">
                                        <button
                                            onClick={() => { onSelectFolder(folder.id); onTagFilter(null) }}
                                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id }) }}
                                            className={cn(
                                                "flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all text-left",
                                                isSelected
                                                    ? "bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-zinc-100 font-semibold"
                                                    : "text-[#374151] dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-[#1a1a2e] dark:hover:text-zinc-200"
                                            )}
                                        >
                                            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                                isSelected ? "bg-indigo-100 dark:bg-indigo-950/50" : "bg-slate-100 dark:bg-zinc-700/60"
                                            )}>
                                                <NoteIcon iconName="Folder" className="w-3.5 h-3.5 text-blue-400 dark:text-blue-500 opacity-80" />
                                            </div>
                                            {isEditing ? (
                                                <input autoFocus value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onBlur={() => { onRenameFolder(folder.id, editingName || folder.name); setEditingFolderId(null) }}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') { onRenameFolder(folder.id, editingName || folder.name); setEditingFolderId(null) }
                                                        if (e.key === 'Escape') setEditingFolderId(null)
                                                        e.stopPropagation()
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    className="flex-1 min-w-0 text-[13px] bg-transparent border-b border-indigo-400 outline-none text-[#1a1a2e]"
                                                />
                                            ) : (
                                                <span className="truncate flex-1">{folder.name}</span>
                                            )}
                                            {count > 0 && !isEditing && (
                                                <span className="text-[10px] font-mono text-[#9ca3af] dark:text-zinc-500 flex-shrink-0">{count}</span>
                                            )}
                                        </button>
                                        <div className="flex opacity-0 group-hover/folder:opacity-100 transition-opacity flex-shrink-0 ml-0.5">
                                            <button onClick={() => { setEditingFolderId(folder.id); setEditingName(folder.name) }}
                                                className="p-1 text-[#9ca3af] hover:text-[#6b7280] dark:text-zinc-500 dark:hover:text-zinc-400 transition-colors">
                                                <Pencil className="w-2.5 h-2.5" />
                                            </button>
                                            <button onClick={() => onDeleteFolder(folder.id)}
                                                className="p-1 text-[#9ca3af] hover:text-red-400 dark:text-zinc-500 dark:hover:text-red-400 transition-colors">
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                            {folders.length === 0 && (
                                <button onClick={() => onCreateFolder()}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-[#9ca3af] dark:text-zinc-500 hover:text-indigo-500 hover:bg-slate-50 transition-all">
                                    <Plus className="w-3 h-3" />
                                    New folder
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Objects */}
                    {(visibleTypes.length > 0 || onCreateObjectType) && (
                        <div className="pt-4">
                            <div className="px-1 mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                                    <span className="font-mono font-bold text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] dark:text-zinc-500">Objects</span>
                                </div>
                                {onCreateObjectType && (
                                    <button onClick={() => { setCreatingObjectType(true); setNewObjectTypeName('') }} title="New object type"
                                        className="text-[#9ca3af] hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            {creatingObjectType && (
                                <form
                                    onSubmit={e => {
                                        e.preventDefault()
                                        const name = newObjectTypeName.trim()
                                        if (name) onCreateObjectType?.(name, 'Star')
                                        setCreatingObjectType(false)
                                        setNewObjectTypeName('')
                                    }}
                                    className="mb-2 flex items-center gap-1"
                                >
                                    <input
                                        autoFocus
                                        value={newObjectTypeName}
                                        onChange={e => setNewObjectTypeName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Escape') { setCreatingObjectType(false); setNewObjectTypeName('') } }}
                                        placeholder="Type name…"
                                        className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-slate-50 dark:bg-zinc-800 text-[11px] text-[#374151] dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 outline-none focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-800"
                                    />
                                    <button type="submit" className="p-1 text-indigo-500 hover:text-indigo-600 transition-colors flex-shrink-0">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                    <button type="button" onClick={() => { setCreatingObjectType(false); setNewObjectTypeName('') }}
                                        className="p-1 text-[#9ca3af] hover:text-[#6b7280] dark:text-zinc-500 dark:hover:text-zinc-400 transition-colors flex-shrink-0">
                                        <X className="w-3 h-3" />
                                    </button>
                                </form>
                            )}
                            <div className="space-y-2">
                                {visibleTypes.map(objType => {
                                    const typeObjects = people
                                    .filter(p => (p.typeId ?? 'person') === objType.id)
                                    .filter(p => !p.noteId || notes.some(n => n.id === p.noteId && !n.trashedAt))
                                    return (
                                        <div key={objType.id}>
                                            {/* Type header — label click opens board view, chevron toggles collapse */}
                                            <div
                                                className={cn(
                                                    "w-full flex items-center gap-1.5 px-1.5 py-1 mb-1 rounded-md border transition-colors",
                                                    selectedObjectTypeId === objType.id
                                                        ? "bg-indigo-600 dark:bg-indigo-600 border-indigo-500 dark:border-indigo-500 shadow-sm"
                                                        : "bg-slate-50 dark:bg-zinc-800/60 border-slate-300 dark:border-zinc-600"
                                                )}
                                                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'objectType', id: objType.id }) }}
                                            >
                                                {/* Icon — click to change (custom types only) */}
                                                {!objType.isBuiltin && onUpdateObjectType ? (
                                                    <div className="relative flex-shrink-0">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setIconPickerTypeId(iconPickerTypeId === objType.id ? null : objType.id) }}
                                                            title="Change icon"
                                                            className={cn("w-5 h-5 rounded flex items-center justify-center transition-colors",
                                                                selectedObjectTypeId === objType.id ? "hover:bg-indigo-700" : "hover:bg-slate-200 dark:hover:bg-zinc-700"
                                                            )}
                                                        >
                                                            <NoteIcon iconName={objType.emoji} className={cn("w-3.5 h-3.5", selectedObjectTypeId === objType.id ? "text-white" : "text-[#6b7280]")} />
                                                        </button>
                                                        {iconPickerTypeId === objType.id && (
                                                            <div ref={iconPickerRef}
                                                                className="absolute left-0 top-full mt-1 z-50 w-[180px] max-h-[200px] overflow-y-auto rounded-xl border border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-1.5 grid grid-cols-6 gap-0.5">
                                                                {NOTE_ICON_KEYS.map(key => {
                                                                    const Icon = FUTURISTIC_ICONS[key]
                                                                    return (
                                                                        <button key={key} title={key}
                                                                            onClick={e => {
                                                                                e.stopPropagation()
                                                                                onUpdateObjectType(objType.id, { emoji: key })
                                                                                setIconPickerTypeId(null)
                                                                            }}
                                                                            className={cn(
                                                                                "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                                                                                objType.emoji === key ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400" : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-[#6b7280] dark:text-zinc-400"
                                                                            )}>
                                                                            <Icon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <NoteIcon iconName={objType.emoji} className={cn("w-3.5 h-3.5 flex-shrink-0", selectedObjectTypeId === objType.id ? "text-white" : "text-[#6b7280]")} />
                                                )}
                                                {/* Clickable label area — opens board */}
                                                <button
                                                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                                                    onClick={() => onSelectObjectType?.(objType.id)}
                                                >
                                                    <span className={cn("font-mono font-semibold text-[9px] uppercase tracking-[0.12em] flex-1 truncate",
                                                        selectedObjectTypeId === objType.id ? "text-white" : "text-[#374151] dark:text-zinc-300"
                                                    )}>{objType.name}</span>
                                                    {!expandedTypes.has(objType.id) && typeObjects.length > 0 && (
                                                        <span className={cn("font-mono text-[10px] tabular-nums font-medium", selectedObjectTypeId === objType.id ? "text-indigo-200" : "text-[#6b7280] dark:text-zinc-400")}>{typeObjects.length}</span>
                                                    )}
                                                </button>
                                                {/* Chevron — toggles collapse only */}
                                                <button
                                                    className={cn("flex-shrink-0 p-0.5 rounded transition-colors", selectedObjectTypeId === objType.id ? "hover:bg-indigo-700" : "hover:bg-slate-200 dark:hover:bg-zinc-700")}
                                                    onClick={() => toggleTypeExpanded(objType.id)}
                                                >
                                                    <ChevronRight className={cn(
                                                        "w-3 h-3 transition-transform duration-150",
                                                        selectedObjectTypeId === objType.id ? "text-indigo-200" : "text-[#9ca3af] dark:text-zinc-400",
                                                        expandedTypes.has(objType.id) && "rotate-90"
                                                    )} />
                                                </button>
                                            </div>
                                            {expandedTypes.has(objType.id) && (
                                            <div className="space-y-0.5">
                                                {typeObjects.map(person => (
                                                    <div key={person.id} className="group/person flex items-center">
                                                        <button
                                                            onClick={() => {
                                                                if (person.noteId) {
                                                                    onSelectObjectType?.(objType.id)
                                                                    onSelect(person.noteId)
                                                                }
                                                            }}
                                                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'person', id: person.id }) }}
                                                            className={cn(
                                                                "flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1 rounded-lg text-[12px] transition-all text-left border",
                                                                person.noteId && activeId === person.noteId
                                                                    ? "bg-indigo-50 dark:bg-zinc-800 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-zinc-100 font-semibold"
                                                                    : "bg-white/70 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-[#374151] dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/70 hover:border-slate-300 dark:hover:border-zinc-600 hover:text-[#1a1a2e]"
                                                            )}
                                                        >
                                                            <NoteIcon iconName={person.emoji} className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />
                                                            <span className="truncate">{person.name}</span>
                                                        </button>
                                                        <button onClick={() => onDeletePerson(person.id)}
                                                            className="opacity-0 group-hover/person:opacity-100 transition-opacity p-1 text-[#9ca3af] hover:text-red-400 dark:text-zinc-500 dark:hover:text-red-400 flex-shrink-0">
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {typeObjects.length === 0 && creatingType !== objType.id && (
                                                    <p className="px-3 text-[11px] text-[#9ca3af] dark:text-zinc-500 italic">No {objType.name.toLowerCase()}s yet</p>
                                                )}
                                                {creatingType === objType.id ? (
                                                    <div className="flex items-center px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-xl shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-900/50 border border-indigo-100">
                                                        <input
                                                            autoFocus
                                                            value={creatingName}
                                                            onChange={e => setCreatingName(e.target.value)}
                                                            placeholder={`New ${objType.name.toLowerCase()}...`}
                                                            className="w-full bg-transparent outline-none text-[12px] text-[#1a1a2e] dark:text-zinc-200 placeholder:text-[#d1d5db]"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && creatingName.trim()) {
                                                                    onCreatePerson(creatingName.trim(), objType.id)
                                                                    setCreatingType(null)
                                                                    setCreatingName('')
                                                                }
                                                                if (e.key === 'Escape') setCreatingType(null)
                                                                e.stopPropagation()
                                                            }}
                                                            onBlur={() => setCreatingType(null)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <button onClick={() => { setCreatingType(objType.id); setCreatingName('') }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[11px] text-[#9ca3af] dark:text-zinc-600 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-all mt-0.5">
                                                        <Plus className="w-3 h-3" />
                                                        New {objType.name.toLowerCase()}
                                                    </button>
                                                )}
                                            </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {allTags.length > 0 && (
                        <div className="pt-4">
                            <div className="flex items-center justify-between px-1 mb-2">
                                <span className="font-mono font-bold text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] dark:text-zinc-500">Tags</span>
                                {activeTag && (
                                    <button onClick={() => onTagFilter(null)} className="font-mono text-[9px] text-indigo-500 hover:underline">clear</button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                                {allTags.map(tag => (
                                    <span key={tag} className="group relative inline-flex items-center">
                                        <button
                                            onClick={() => { onTagFilter(activeTag === tag ? null : tag); onSelectFolder(null) }}
                                            className={cn(
                                                "flex items-center gap-1 pl-2 pr-6 py-1 rounded-md text-[11px] transition-all",
                                                activeTag === tag
                                                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-200 dark:ring-indigo-900/50"
                                                    : "bg-white dark:bg-zinc-800/50 text-[#6b7280] dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50 border border-[#e5e7eb] dark:border-zinc-800"
                                            )}
                                        >
                                            <Hash className={cn("w-3 h-3 opacity-70 flex-shrink-0", activeTag === tag ? "text-indigo-600 dark:text-indigo-400" : "")} />
                                            <span className="font-mono text-[11px] truncate max-w-[100px]">{tag}</span>
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); onDeleteTag(tag) }}
                                            title={`Delete #${tag} from all notes`}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[#9ca3af] dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Trash — pinned above footer */}
            <div className="px-3 py-2 border-t border-white/40 dark:border-white/[0.06]">
                <button
                    onClick={onSelectTrash}
                    className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all text-left",
                        trashView
                            ? "bg-red-50 dark:bg-zinc-800 text-red-600 dark:text-red-400 font-semibold"
                            : "text-[#374151] dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-[#1a1a2e] dark:hover:text-zinc-200"
                    )}
                >
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                        trashView ? "bg-red-100 dark:bg-red-950/50" : "bg-slate-100 dark:bg-zinc-700/60"
                    )}>
                        <Trash2 className={cn("w-3.5 h-3.5 transition-colors",
                            trashView ? "text-red-500 dark:text-red-400" : "text-[#9ca3af] dark:text-zinc-500"
                        )} />
                    </div>
                    <span className="flex-1 text-[13px]">Trash</span>
                    {trashCount > 0 && (
                        <span className="text-[10px] font-mono text-[#9ca3af] dark:text-zinc-500 tabular-nums">{trashCount}</span>
                    )}
                </button>
            </div>

            {/* Context menu */}
            {ctxMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
                    <div className="fixed z-50 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-[#e5e7eb] dark:border-zinc-800 py-1 min-w-[160px]" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
                        {ctxMenu.type === 'person' && (
                            <button onClick={() => { onDeletePerson(ctxMenu.id); setCtxMenu(null) }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Move to trash
                            </button>
                        )}
                        {ctxMenu.type === 'folder' && (
                            <button onClick={() => { onDeleteFolder(ctxMenu.id); setCtxMenu(null) }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete folder
                            </button>
                        )}
                        {ctxMenu.type === 'objectType' && (
                            <button onClick={() => { onPromptDeleteObjectType(ctxMenu.id); setCtxMenu(null) }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete {allTypes.find(t => t.id === ctxMenu.id)?.name || 'type'}
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}

            {/* Footer */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-white/50 dark:border-white/[0.07]">
                <div className="flex items-center gap-1">
                    <ThemeSwitcher />
                    <a
                        href={DISCORD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Join the Discord community"
                        className="w-7 h-7 rounded-xl flex items-center justify-center transition-all text-[#9ca3af] dark:text-zinc-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                        <DiscordIcon className="w-3.5 h-3.5" />
                    </a>
                    {onSignOut && (
                        <button
                            onClick={onSignOut}
                            title="Sign out"
                            className="w-7 h-7 rounded-xl flex items-center justify-center transition-all text-[#9ca3af] dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <button onClick={onToggleGraph}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all",
                        graphOpen
                            ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400"
                            : "text-[#9ca3af] dark:text-zinc-600 hover:text-[#374151] dark:hover:text-zinc-400 hover:bg-slate-50"
                    )}
                >
                    <Network className="w-3 h-3" />
                    Graph
                </button>
            </div>
        </div>
    )
}
