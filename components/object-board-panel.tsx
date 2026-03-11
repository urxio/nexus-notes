"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { Plus, Settings2, Check, X, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Note, Person, ObjectType, NoteProperty } from "@/lib/types"
import { NoteIcon } from "@/components/note-icon"
import { ScrollArea } from "@/components/ui/scroll-area"
import { defaultPropertiesForType } from "@/lib/storage"

interface ObjectBoardPanelProps {
    objectType: ObjectType
    objects: Person[]
    notes: Note[]
    people: Person[]
    activeId: string | null
    onSelectObject: (noteId: string) => void
    onCreateObject: (name: string, typeId: string) => void
}

function chipStyle(color: string) {
    return { background: color + '22', color, borderColor: color + '55' }
}

function formatDate(ts: number): string {
    const diff = Date.now() - ts
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return new Date(ts).toLocaleDateString('en', { weekday: 'short' })
    return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function PropValue({ prop, people }: { prop: NoteProperty; people: Person[] }) {
    const isEmpty =
        prop.value === null ||
        prop.value === undefined ||
        prop.value === '' ||
        (Array.isArray(prop.value) && prop.value.length === 0)
    if (isEmpty) return null

    switch (prop.type) {
        case 'select': {
            if (!prop.value) return null
            const opt = prop.options?.find(o => o.label === prop.value)
            const color = opt?.color || '#6366f1'
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border"
                    style={chipStyle(color)}>
                    {String(prop.value)}
                </span>
            )
        }
        case 'multi_select': {
            const vals = Array.isArray(prop.value) ? (prop.value as string[]) : []
            if (!vals.length) return null
            return (
                <div className="flex items-center gap-1 flex-wrap">
                    {vals.slice(0, 3).map(v => {
                        const opt = prop.options?.find(o => o.label === v)
                        const color = opt?.color || '#6366f1'
                        return (
                            <span key={v} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border"
                                style={chipStyle(color)}>
                                {v}
                            </span>
                        )
                    })}
                    {vals.length > 3 && <span className="text-[10px] text-muted-foreground">+{vals.length - 3}</span>}
                </div>
            )
        }
        case 'checkbox':
            return prop.value
                ? <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">✓ Yes</span>
                : null
        case 'date': {
            if (!prop.value) return null
            try {
                const d = new Date(String(prop.value))
                return <span className="text-[11px] text-muted-foreground">{d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
            } catch { return <span className="text-[11px] text-muted-foreground">{String(prop.value)}</span> }
        }
        case 'person': {
            const ids = Array.isArray(prop.value) ? (prop.value as string[]) : (prop.value ? [String(prop.value)] : [])
            const matched = ids.map(id => people.find(p => p.id === id)).filter(Boolean) as Person[]
            if (!matched.length) return null
            return (
                <div className="flex items-center gap-1 flex-wrap">
                    {matched.slice(0, 2).map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                            <UserCircle className="w-3 h-3 flex-shrink-0" />
                            {p.name}
                        </span>
                    ))}
                    {matched.length > 2 && <span className="text-[10px] text-muted-foreground">+{matched.length - 2}</span>}
                </div>
            )
        }
        case 'url':
            return <span className="text-[11px] text-indigo-500 dark:text-indigo-400 truncate max-w-[160px] font-mono">{String(prop.value).replace(/^https?:\/\//, '')}</span>
        case 'email':
            return <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{String(prop.value)}</span>
        case 'phone':
            return <span className="text-[11px] text-muted-foreground font-mono">{String(prop.value)}</span>
        default:
            return <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{String(prop.value)}</span>
    }
}

export function ObjectBoardPanel({
    objectType, objects, notes, people, activeId, onSelectObject, onCreateObject
}: ObjectBoardPanelProps) {
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const settingsRef = useRef<HTMLDivElement>(null)

    // Canonical property names for this type ONLY — never mix in props from other types
    const allPropNames = useMemo(() => {
        return defaultPropertiesForType(objectType.id).map(p => p.name)
    }, [objectType.id])

    // Persisted visible prop names per type — default: all visible
    // Always filter against allPropNames to strip any stale cross-type names from localStorage
    const [visiblePropNames, setVisiblePropNames] = useState<string[]>(() => {
        const canonical = defaultPropertiesForType(objectType.id).map(p => p.name)
        if (typeof window === 'undefined') return canonical
        try {
            const raw = localStorage.getItem(`locus-board-visible-${objectType.id}`)
            if (raw) {
                const saved = JSON.parse(raw) as string[]
                const filtered = saved.filter(n => canonical.includes(n))
                return filtered.length > 0 ? filtered : canonical
            }
        } catch {}
        return canonical
    })

    useEffect(() => {
        try { localStorage.setItem(`locus-board-visible-${objectType.id}`, JSON.stringify(visiblePropNames)) } catch {}
    }, [visiblePropNames, objectType.id])

    // Re-sync when objectType changes (switching types) — always filter to canonical names
    useEffect(() => {
        const canonical = defaultPropertiesForType(objectType.id).map(p => p.name)
        try {
            const raw = localStorage.getItem(`locus-board-visible-${objectType.id}`)
            if (raw) {
                const saved = JSON.parse(raw) as string[]
                const filtered = saved.filter(n => canonical.includes(n))
                setVisiblePropNames(filtered.length > 0 ? filtered : canonical)
            } else {
                setVisiblePropNames(canonical)
            }
        } catch { setVisiblePropNames(canonical) }
    }, [objectType.id])

    // Close settings on outside click
    useEffect(() => {
        if (!settingsOpen) return
        function handler(e: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false)
        }
        window.addEventListener('mousedown', handler)
        return () => window.removeEventListener('mousedown', handler)
    }, [settingsOpen])

    function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        const name = newName.trim()
        if (!name) return
        onCreateObject(name, objectType.id)
        setNewName('')
        setCreating(false)
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 border-b border-[#f3f4f6] dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            <NoteIcon iconName={objectType.emoji} className="w-4 h-4 text-[#6b7280] dark:text-zinc-400" />
                        </div>
                        <h2 className="font-bold text-[15px] text-[#111827] dark:text-zinc-100 tracking-tight truncate">{objectType.name}</h2>
                        <span className="text-[11px] font-mono text-[#d1d5db] dark:text-zinc-700 tabular-nums flex-shrink-0">{objects.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Property visibility toggle */}
                        <div className="relative" ref={settingsRef}>
                            <button
                                onClick={() => setSettingsOpen(v => !v)}
                                title="Toggle visible properties"
                                className={cn(
                                    "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                    settingsOpen
                                        ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                        : "hover:bg-[#f3f4f6] dark:hover:bg-zinc-800 text-[#9ca3af] dark:text-zinc-600"
                                )}>
                                <Settings2 className="w-3.5 h-3.5" />
                            </button>
                            {settingsOpen && (
                                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl z-50 py-2 overflow-hidden">
                                    <p className="px-3 pb-2 font-mono text-[9px] uppercase tracking-widest text-[#d1d5db] dark:text-zinc-600">
                                        Visible on cards
                                    </p>
                                    {allPropNames.map(name => {
                                        const visible = visiblePropNames.includes(name)
                                        return (
                                            <button key={name}
                                                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#f9fafb] dark:hover:bg-zinc-800 transition-colors text-left"
                                                onClick={() => setVisiblePropNames(prev =>
                                                    prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
                                                )}>
                                                <div className={cn(
                                                    "w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                                    visible ? "bg-indigo-500/20 border-indigo-400" : "border-[#d1d5db] dark:border-zinc-600"
                                                )}>
                                                    {visible && <Check className="w-2 h-2 text-indigo-500" />}
                                                </div>
                                                <span className="text-[12px] text-[#374151] dark:text-zinc-300">{name}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Create new */}
                        <button onClick={() => setCreating(true)} title={`New ${objectType.name}`}
                            className="w-7 h-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors shadow-sm">
                            <Plus className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Inline create */}
                {creating && (
                    <form onSubmit={handleCreate} className="flex items-center gap-2">
                        <input
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={`New ${objectType.name.toLowerCase()}…`}
                            onKeyDown={e => { if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-[#f9fafb] dark:bg-zinc-800 text-[12px] text-[#374151] dark:text-zinc-300 border border-[#e5e7eb] dark:border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 transition-all"
                        />
                        <button type="submit"
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-medium transition-colors">
                            Add
                        </button>
                        <button type="button" onClick={() => { setCreating(false); setNewName('') }}
                            className="w-7 h-7 rounded-xl hover:bg-[#f3f4f6] dark:hover:bg-zinc-800 flex items-center justify-center transition-colors">
                            <X className="w-3.5 h-3.5 text-[#9ca3af]" />
                        </button>
                    </form>
                )}
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1">
                {objects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#f9fafb] dark:bg-zinc-800 flex items-center justify-center border border-[#e5e7eb] dark:border-zinc-700">
                            <NoteIcon iconName={objectType.emoji} className="w-6 h-6 text-[#d1d5db] dark:text-zinc-600" />
                        </div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#d1d5db] dark:text-zinc-700">
                            No {objectType.name.toLowerCase()}s yet
                        </p>
                    </div>
                ) : (
                    <div className="px-3 pt-3 pb-3 space-y-2">
                        {objects.map(obj => {
                            const note = notes.find(n => n.id === obj.noteId)
                            const isActive = note?.id === activeId
                            // Show all toggled-on properties (by name), restricted to this type's canonical props
                            const noteProps = note?.properties ?? []
                            const visibleProps = visiblePropNames
                                .filter(name => allPropNames.includes(name)) // strict type guard — never show other-type props
                                .map(name => {
                                    const found = noteProps.find(p => p.name === name)
                                    // Fall back to a default empty prop so the row still shows
                                    return found ?? { id: name, name, type: 'text' as const, value: null }
                                })

                            return (
                                <button key={obj.id}
                                    onClick={() => obj.noteId && onSelectObject(obj.noteId)}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-xl transition-all cursor-pointer",
                                        isActive
                                            ? "bg-white dark:bg-zinc-800 border-2 border-indigo-500 dark:border-indigo-500 shadow-[0_2px_12px_rgba(99,102,241,0.12)]"
                                            : "bg-white dark:bg-zinc-800/50 border border-[#e5e7eb] dark:border-zinc-700/60 hover:border-[#c7d2fe] dark:hover:border-indigo-800 hover:shadow-sm hover:bg-[#fafaff] dark:hover:bg-zinc-800"
                                    )}
                                >
                                    {/* Title row */}
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="flex items-start gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: (note?.color ?? '#6366f1') + '22' }}>
                                                <NoteIcon iconName={obj.emoji || objectType.emoji} className="w-4 h-4" />
                                            </div>
                                            <span className={cn(
                                                "text-[13.5px] leading-snug break-words min-w-0",
                                                isActive ? "font-bold text-[#111827] dark:text-zinc-100" : "font-semibold text-[#374151] dark:text-zinc-300"
                                            )}>
                                                {obj.name || 'Untitled'}
                                            </span>
                                        </div>
                                        {note && (
                                            <span className="font-mono text-[9px] text-[#d1d5db] dark:text-zinc-600 flex-shrink-0 mt-0.5">
                                                {formatDate(note.updatedAt)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Property rows — always shown when toggled on */}
                                    {visibleProps.length > 0 && (
                                        <div className="pl-9 space-y-1 mt-2">
                                            {visibleProps.map(prop => {
                                                const isEmpty =
                                                    prop.value === null || prop.value === undefined || prop.value === '' ||
                                                    (Array.isArray(prop.value) && prop.value.length === 0)
                                                return (
                                                    <div key={prop.id} className="flex items-start gap-2">
                                                        <span className="text-[10px] font-medium text-[#9ca3af] dark:text-zinc-600 flex-shrink-0 w-[60px] truncate pt-0.5">
                                                            {prop.name}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            {isEmpty
                                                                ? <span className="text-[11px] text-[#d1d5db] dark:text-zinc-700">—</span>
                                                                : <PropValue prop={prop} people={people} />
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
