import React, { useState } from "react"
import { createPortal } from "react-dom"
import { Plus, Search, FileText, Trash2, RotateCcw } from "lucide-react"
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
    onDeleteNote: (noteId: string) => void
    isTrash?: boolean
    onRestoreNote?: (noteId: string) => void
    onPermanentDeleteNote?: (noteId: string) => void
}

export function NoteListPanel({ notes, folders, selectedFolderId, activeTag, activeId, onSelect, onCreate, search, onSearch, onMoveNote, onDeleteNote, isTrash, onRestoreNote, onPermanentDeleteNote }: NoteListPanelProps) {
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; noteId: string } | null>(null)

    const label = isTrash
        ? 'Trash'
        : selectedFolderId
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
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 border-b border-[#f3f4f6] dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-[15px] text-[#111827] dark:text-zinc-100 tracking-tight truncate">{label}</h2>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[11px] font-mono text-[#d1d5db] dark:text-zinc-700 tabular-nums">{notes.length}</span>
                        {!isTrash && (
                            <button onClick={onCreate} title="New note"
                                className="w-7 h-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors shadow-sm">
                                <Plus className="w-3.5 h-3.5 text-white" />
                            </button>
                        )}
                    </div>
                </div>
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#d1d5db] dark:text-zinc-600" />
                    <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search…"
                        className="w-full pl-8 pr-4 py-2 rounded-xl bg-[#f9fafb] dark:bg-zinc-800 text-[12px] text-[#374151] dark:text-zinc-300 placeholder-[#d1d5db] dark:placeholder-zinc-600 border border-[#e5e7eb] dark:border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 focus:border-indigo-300 transition-all"
                    />
                </div>
            </div>

            {/* Note cards */}
            <ScrollArea className="flex-1">
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#f9fafb] dark:bg-zinc-800 flex items-center justify-center border border-[#e5e7eb] dark:border-zinc-700">
                            <FileText className="w-5 h-5 text-[#d1d5db] dark:text-zinc-700" />
                        </div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#d1d5db] dark:text-zinc-700">No notes</p>
                    </div>
                ) : (
                    <div className="px-3 pt-3 pb-3 space-y-2">
                        {notes.map(note => {
                            const isActive = note.id === activeId
                            const preview = getPreview(note)
                            return (
                                <button key={note.id}
                                    onClick={() => onSelect(note.id)}
                                    onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, noteId: note.id }) }}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-xl transition-all cursor-pointer",
                                        isActive
                                            ? "bg-white dark:bg-zinc-800 border-2 border-indigo-500 dark:border-indigo-500 shadow-[0_2px_12px_rgba(99,102,241,0.12)]"
                                            : "bg-white dark:bg-zinc-800/50 border border-[#e5e7eb] dark:border-zinc-700/60 hover:border-[#c7d2fe] dark:hover:border-indigo-800 hover:shadow-sm hover:bg-[#fafaff] dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: note.color + '22' }}>
                                                <NoteIcon iconName={note.emoji} className="w-4 h-4 leading-none" />
                                            </div>
                                            <span className={cn(
                                                "text-[13.5px] leading-snug truncate",
                                                isActive
                                                    ? "font-bold text-[#111827] dark:text-zinc-100"
                                                    : "font-semibold text-[#374151] dark:text-zinc-300"
                                            )}>
                                                {note.title || 'Untitled'}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[9px] text-[#d1d5db] dark:text-zinc-600 flex-shrink-0 mt-0.5">{formatDate(note.updatedAt)}</span>
                                    </div>
                                    {preview && (
                                        <p className="text-[11px] text-[#9ca3af] dark:text-zinc-600 line-clamp-2 leading-relaxed pl-9">{preview}</p>
                                    )}
                                    {note.tags.length > 0 && (
                                        <div className="flex gap-1 mt-2 pl-9 flex-wrap">
                                            {note.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className={cn(
                                                    "font-mono text-[9px] px-1.5 py-0.5 rounded-full",
                                                    isActive
                                                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                                                        : "bg-[#f9fafb] dark:bg-zinc-700/60 text-[#9ca3af] dark:text-zinc-500 ring-1 ring-[#e5e7eb] dark:ring-zinc-700"
                                                )}>#{tag}</span>
                                            ))}
                                            {note.tags.length > 2 && <span className="font-mono text-[9px] text-[#d1d5db] dark:text-zinc-700">+{note.tags.length - 2}</span>}
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
                    <div className="fixed z-50 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-[#e5e7eb] dark:border-zinc-800 py-2 min-w-[200px] overflow-hidden"
                        style={{ left: ctxMenu.x, top: ctxMenu.y }}>
                        {isTrash ? (
                            /* ── Trash context menu ── */
                            <>
                                <button onClick={() => { onRestoreNote?.(ctxMenu.noteId); setCtxMenu(null) }}
                                    className="w-full text-left px-4 py-2 text-[12px] hover:bg-[#f9fafb] dark:hover:bg-zinc-800 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 transition-colors">
                                    <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
                                    Restore note
                                </button>
                                <div className="h-px bg-[#f3f4f6] dark:bg-zinc-800 my-1 mx-2" />
                                <button onClick={() => { onPermanentDeleteNote?.(ctxMenu.noteId); setCtxMenu(null) }}
                                    className="w-full text-left px-4 py-2 text-[12px] hover:bg-[#f9fafb] dark:hover:bg-zinc-800 flex items-center gap-2 text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    Delete forever
                                </button>
                            </>
                        ) : (
                            /* ── Normal context menu ── */
                            <>
                                <div className="px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#d1d5db] dark:text-zinc-700 mb-1">
                                    Move to folder
                                </div>
                                <button onClick={() => { onMoveNote(ctxMenu.noteId, null); setCtxMenu(null) }}
                                    className="w-full text-left px-4 py-2 text-[12px] hover:bg-[#f9fafb] dark:hover:bg-zinc-800 flex items-center gap-2 text-[#374151] dark:text-zinc-400 transition-colors">
                                    <FileText className="w-3.5 h-3.5 text-[#d1d5db] flex-shrink-0" />
                                    Root (no folder)
                                </button>
                                {folders.map(folder => (
                                    <button key={folder.id}
                                        onClick={() => { onMoveNote(ctxMenu.noteId, folder.id); setCtxMenu(null) }}
                                        className="w-full text-left px-4 py-2 text-[12px] hover:bg-[#f9fafb] dark:hover:bg-zinc-800 flex items-center gap-2 text-[#374151] dark:text-zinc-400 transition-colors">
                                        <NoteIcon iconName="Folder" className="w-3 h-3 text-[11px] flex-shrink-0 text-muted-foreground" />
                                        <span className="truncate">{folder.name}</span>
                                    </button>
                                ))}
                                {folders.length === 0 && <p className="px-4 py-2 text-[11px] text-[#d1d5db] italic">No folders yet</p>}
                                <div className="h-px bg-[#f3f4f6] dark:bg-zinc-800 my-1 mx-2" />
                                <button onClick={() => { onDeleteNote(ctxMenu.noteId); setCtxMenu(null) }}
                                    className="w-full text-left px-4 py-2 text-[12px] hover:bg-[#f9fafb] dark:hover:bg-zinc-800 flex items-center gap-2 text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    Move to trash
                                </button>
                            </>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}
