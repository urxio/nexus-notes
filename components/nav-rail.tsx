import React, { useState } from "react"
import { createPortal } from "react-dom"
import { Plus, PanelLeftClose, FileText, FolderPlus, Pencil, Trash2, X, Hash, Network } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Folder, Person, ObjectType, Note } from "@/lib/types"
import { BUILTIN_OBJECT_TYPES } from "@/lib/constants"
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
}

export function NavRail({ folders, selectedFolderId, onSelectFolder, people, objectTypes, deletedObjectTypes, onPromptDeleteObjectType, onDeletePerson, onCreatePerson, onCreateFolder, onDeleteFolder, onRenameFolder, onCreate, activeId, onSelect, allTags, activeTag, onTagFilter, graphOpen, onToggleGraph, notes, onToggleSidebar }: NavRailProps) {
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [creatingType, setCreatingType] = useState<string | null>(null)
    const [creatingName, setCreatingName] = useState('')
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: 'person' | 'folder' | 'objectType'; id: string } | null>(null)
    const allTypes = [...BUILTIN_OBJECT_TYPES, ...objectTypes].filter(t => !deletedObjectTypes.includes(t.id))
    const visibleTypes = allTypes.filter(t => t.isBuiltin || people.some(p => (p.typeId ?? 'person') === t.id))

    return (
        <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl dark:bg-zinc-900">
            {/* Identity header */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Locus Logo" className="w-8 h-8 rounded-[10px] shadow-sm flex-shrink-0" />
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
                        <span className="text-[10px] font-mono text-[#d1d5db] dark:text-zinc-700 tabular-nums">{notes.length}</span>
                    </button>

                    {/* Folders */}
                    <div className="pt-4">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span className="font-mono font-bold text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] dark:text-zinc-500">Folders</span>
                            </div>
                            <button onClick={() => onCreateFolder()} title="New folder"
                                className="text-[#d1d5db] hover:text-indigo-500 dark:text-zinc-700 dark:hover:text-indigo-400 transition-colors">
                                <FolderPlus className="w-3 h-3" />
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
                                                <span className="text-[10px] font-mono text-[#d1d5db] dark:text-zinc-700 flex-shrink-0">{count}</span>
                                            )}
                                        </button>
                                        <div className="flex opacity-0 group-hover/folder:opacity-100 transition-opacity flex-shrink-0 ml-0.5">
                                            <button onClick={() => { setEditingFolderId(folder.id); setEditingName(folder.name) }}
                                                className="p-1 text-[#d1d5db] hover:text-[#6b7280] dark:text-zinc-700 dark:hover:text-zinc-400 transition-colors">
                                                <Pencil className="w-2.5 h-2.5" />
                                            </button>
                                            <button onClick={() => onDeleteFolder(folder.id)}
                                                className="p-1 text-[#d1d5db] hover:text-red-400 dark:text-zinc-700 dark:hover:text-red-400 transition-colors">
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                            {folders.length === 0 && (
                                <button onClick={() => onCreateFolder()}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-[#d1d5db] dark:text-zinc-700 hover:text-indigo-500 hover:bg-slate-50 transition-all">
                                    <Plus className="w-3 h-3" />
                                    New folder
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Objects */}
                    {visibleTypes.length > 0 && (
                        <div className="pt-4">
                            <div className="px-1 mb-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                                <span className="font-mono font-bold text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] dark:text-zinc-500">Objects</span>
                            </div>
                            <div className="space-y-2">
                                {visibleTypes.map(objType => {
                                    const typeObjects = people.filter(p => (p.typeId ?? 'person') === objType.id)
                                    return (
                                        <div key={objType.id}>
                                            <div
                                                className="flex items-center gap-1.5 px-1.5 py-1 mb-1 bg-slate-50 dark:bg-zinc-800/50 rounded-md cursor-context-menu border border-slate-100 dark:border-zinc-700/50"
                                                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'objectType', id: objType.id }) }}
                                            >
                                                <NoteIcon iconName={objType.emoji} className="w-3.5 h-3.5 text-[#6b7280]" />
                                                <span className="font-mono font-semibold text-[9px] uppercase tracking-[0.12em] text-[#374151] dark:text-zinc-300">{objType.name}</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {typeObjects.map(person => (
                                                    <div key={person.id} className="group/person flex items-center">
                                                        <button
                                                            onClick={() => person.noteId && onSelect(person.noteId)}
                                                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, type: 'person', id: person.id }) }}
                                                            className={cn(
                                                                "flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all text-left",
                                                                person.noteId && activeId === person.noteId
                                                                    ? "bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-zinc-100 font-semibold"
                                                                    : "text-[#374151] dark:text-zinc-400 font-medium hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-[#1a1a2e]"
                                                            )}
                                                        >
                                                            <NoteIcon iconName={person.emoji} className="w-3 h-3 flex-shrink-0 opacity-70" />
                                                            <span className="truncate">{person.name}</span>
                                                        </button>
                                                        <button onClick={() => onDeletePerson(person.id)}
                                                            className="opacity-0 group-hover/person:opacity-100 transition-opacity p-1 text-[#d1d5db] hover:text-red-400 dark:text-zinc-700 dark:hover:text-red-400 flex-shrink-0">
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {typeObjects.length === 0 && creatingType !== objType.id && (
                                                    <p className="px-3 text-[11px] text-[#d1d5db] dark:text-zinc-700 italic">No {objType.name.toLowerCase()}s yet</p>
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
                                <span className="font-mono font-bold text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] dark:text-zinc-700">Tags</span>
                                {activeTag && (
                                    <button onClick={() => onTagFilter(null)} className="font-mono text-[9px] text-indigo-500 hover:underline">clear</button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                                {allTags.map(tag => (
                                    <button key={tag}
                                        onClick={() => { onTagFilter(activeTag === tag ? null : tag); onSelectFolder(null) }}
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all",
                                            activeTag === tag
                                                ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-200 dark:ring-indigo-900/50"
                                                : "bg-white dark:bg-zinc-800/50 text-[#6b7280] dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50 border border-[#e5e7eb] dark:border-zinc-800"
                                        )}
                                    >
                                        <Hash className={cn("w-3 h-3 opacity-70", activeTag === tag ? "text-indigo-600 dark:text-indigo-400" : "")} />
                                        <span className="font-mono text-[11px] truncate max-w-[120px]">{tag}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Context menu */}
            {ctxMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
                    <div className="fixed z-50 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-[#e5e7eb] dark:border-zinc-800 py-1 min-w-[160px]" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
                        {ctxMenu.type === 'person' && (
                            <button onClick={() => { onDeletePerson(ctxMenu.id); setCtxMenu(null) }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Delete object
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
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100/80 dark:border-zinc-800">
                <ThemeSwitcher />
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
