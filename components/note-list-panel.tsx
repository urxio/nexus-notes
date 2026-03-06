import React, { useState } from "react"
import { createPortal } from "react-dom"
import { Plus, Search, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Note, Folder } from "@/lib/types"
import { NoteIcon } from "@/components/note-icon"

interface NoteListPanelProps {
    notes: Note[]
    folders: Folder[]
    selectedFolderId: string | null
    activeTag: string | null
    activeId: string | null
    onSelect: (id: string) => void
    onCreate: () => void
    search: string
    onSearch: (q: string) => void
    onMoveNote: (noteId: string, folderId: string | null) => void
}

export function NoteListPanel({ notes, folders, selectedFolderId, activeTag, activeId, onSelect, onCreate, search, onSearch, onMoveNote }: NoteListPanelProps) {
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)

    const label = selectedFolderId
        ? (folders.find(f => f.id === selectedFolderId)?.name ?? 'Folder')
        : activeTag ? `#${activeTag}` : 'All Notes'

    function formatDate(ts: number): string {
        const diff = Date.now() - ts
        if (diff < 60000) return 'now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
        if (diff < 604800000) return new Date(ts).toLocaleDateString('en', { weekday: 'short' })
        return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    }

    function getPreview(note: Note): string {
        for (const block of note.blocks) {
            if (block.type !== 'divider' && block.content.trim()) return block.content.trim()
        }
        return ''
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            {/* Header */}
            <div className="px-4 pt-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-[15px] text-stone-800 dark:text-zinc-100 truncate">{label}</h2>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[11px] font-mono text-stone-300 dark:text-zinc-700 tabular-nums">{notes.length}</span>
                        <button onClick={onCreate} title="New note"
                            className="w-7 h-7 rounded-xl bg-orange-600 hover:bg-orange-700 flex items-center justify-center transition-colors shadow-sm">
                            <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
                {/* Pill search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-300 dark:text-zinc-600" />
                    <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search…"
                        className="w-full pl-8 pr-4 py-2 rounded-xl bg-stone-100 dark:bg-zinc-800 text-[12px] text-stone-700 dark:text-zinc-300 placeholder-stone-300 dark:placeholder-zinc-600 border-0 outline-none focus:ring-2 focus:ring-stone-200 dark:focus:ring-zinc-700 transition-all"
                    />
                </div>
            </div>

            {/* Note cards */}
            <ScrollArea className="flex-1">
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-zinc-800 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-stone-200 dark:text-zinc-700" />
                        </div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-stone-300 dark:text-zinc-700">No notes</p>
                    </div>
                ) : (
                    <div className="px-3 pb-3 space-y-2">
                        {notes.map(note => {
                            const isActive = note.id === activeId
                            const preview = getPreview(note)
                            return (
                                <button key={note.id}
                                    onClick={() => onSelect(note.id)}
                                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, noteId: note.id }) }}
                                    className={cn(
                                        "w-full text-left p-3 rounded-2xl transition-all",
                                        isActive
                                            ? "bg-stone-100 dark:bg-zinc-800 shadow-sm ring-1 ring-stone-200/80 dark:ring-zinc-700/50"
                                            : "bg-stone-50/70 dark:bg-zinc-800/30 hover:bg-stone-100/80 dark:hover:bg-zinc-800/60"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: note.color + '22' }}>
                                                <NoteIcon iconName={note.emoji} className="w-4 h-4 leading-none" />
                                            </div>
                                            <span className={cn(
                                                "text-[13px] leading-snug truncate",
                                                isActive ? "font-semibold text-stone-900 dark:text-zinc-100" : "font-medium text-stone-700 dark:text-zinc-300"
                                            )}>
                                                {note.title || 'Untitled'}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[9px] text-stone-300 dark:text-zinc-600 flex-shrink-0 mt-1">{formatDate(note.updatedAt)}</span>
                                    </div>
                                    {preview && (
                                        <p className="text-[11px] text-stone-400 dark:text-zinc-600 line-clamp-2 leading-relaxed pl-9">{preview}</p>
                                    )}
                                    {note.tags.length > 0 && (
                                        <div className="flex gap-1 mt-2 pl-9 flex-wrap">
                                            {note.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-700/60 text-stone-400 dark:text-zinc-500 ring-1 ring-stone-100 dark:ring-zinc-700">#{tag}</span>
                                            ))}
                                            {note.tags.length > 2 && <span className="font-mono text-[9px] text-stone-300 dark:text-zinc-700">+{note.tags.length - 2}</span>}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Context menu */}
            {ctxMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
                    <div className="fixed z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-stone-100 dark:border-zinc-800 py-2 min-w-[200px] overflow-hidden"
                        style={{ left: ctxMenu.x, top: ctxMenu.y }}>
                        <div className="px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-stone-300 dark:text-zinc-700 mb-1">
                            Move to folder
                        </div>
                        <button onClick={() => { onMoveNote(ctxMenu.noteId, null); setCtxMenu(null) }}
                            className="w-full text-left px-4 py-2 text-[12px] hover:bg-stone-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-stone-600 dark:text-zinc-400 transition-colors">
                            <FileText className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />
                            Root (no folder)
                        </button>
                        {folders.map(folder => (
                            <button key={folder.id}
                                onClick={() => { onMoveNote(ctxMenu.noteId, folder.id); setCtxMenu(null) }}
                                className="w-full text-left px-4 py-2 text-[12px] hover:bg-stone-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-stone-600 dark:text-zinc-400 transition-colors">
                                <NoteIcon iconName="Folder" className="w-3 h-3 text-[11px] flex-shrink-0 text-muted-foreground" />
                                <span className="truncate">{folder.name}</span>
                            </button>
                        ))}
                        {folders.length === 0 && <p className="px-4 py-2 text-[11px] text-stone-300 italic">No folders yet</p>}
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}
