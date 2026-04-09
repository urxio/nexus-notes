'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import {
    AlignLeft, Hash, Calendar, ChevronDown, Layers, CheckSquare,
    Link, Mail, Phone, UserCircle, Plus, X, Check, ExternalLink,
    ChevronLeft, ChevronRight, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoteProperty, PropertyType, PropertyOption, Person } from '@/lib/types'

// ── Type metadata ──────────────────────────────────────────────────────────────

type PTypeMeta = { label: string; Icon: React.FC<{ className?: string }> }

const TYPE_META: Record<PropertyType, PTypeMeta> = {
    text:         { label: 'Text',         Icon: AlignLeft },
    number:       { label: 'Number',       Icon: Hash },
    date:         { label: 'Date',         Icon: Calendar },
    select:       { label: 'Select',       Icon: ChevronDown },
    multi_select: { label: 'Multi-select', Icon: Layers },
    checkbox:     { label: 'Checkbox',     Icon: CheckSquare },
    url:          { label: 'URL',          Icon: Link },
    email:        { label: 'Email',        Icon: Mail },
    phone:        { label: 'Phone',        Icon: Phone },
    person:       { label: 'Person',       Icon: UserCircle },
}

const OPTION_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

function uid(): string { return Math.random().toString(36).slice(2, 10) }

function defaultValue(t: PropertyType): NoteProperty['value'] {
    if (t === 'checkbox') return false
    if (t === 'multi_select') return []
    if (t === 'person') return []
    return null
}

function chipStyle(color: string) {
    return { background: color + '22', color, borderColor: color + '55' }
}

// ── useClickOutside ────────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) handler()
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [ref, handler, enabled])
}

// ── TypePickerMenu ─────────────────────────────────────────────────────────────

function TypePickerMenu({ onSelect, onClose }: { onSelect: (t: PropertyType) => void; onClose: () => void }) {
    return (
        <div className="absolute z-50 top-full left-0 mt-1 w-44 rounded-xl border border-border bg-popover shadow-xl overflow-hidden py-1">
            {(Object.entries(TYPE_META) as [PropertyType, PTypeMeta][]).map(([type, { label, Icon }]) => (
                <button
                    key={type}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-accent text-left transition-colors"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { onSelect(type); onClose() }}
                >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{label}</span>
                </button>
            ))}
        </div>
    )
}

// ── SelectPopup ────────────────────────────────────────────────────────────────

function SelectPopup({ opts, value, onSelect, onClear, onAddOption, onRemoveOption }: {
    opts: PropertyOption[]
    value: string | null
    onSelect: (id: string) => void
    onClear: () => void
    onAddOption: (label: string) => void
    onRemoveOption: (id: string) => void
}) {
    const [newLabel, setNewLabel] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    useEffect(() => { inputRef.current?.focus() }, [])

    function commit() {
        if (newLabel.trim()) { onAddOption(newLabel.trim()); setNewLabel('') }
    }

    return (
        <div className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border border-border bg-popover shadow-xl overflow-hidden py-1">
            {value && (
                <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground"
                    onMouseDown={e => e.preventDefault()} onClick={onClear}
                >
                    <X className="w-3 h-3" /> Clear
                </button>
            )}
            {opts.map(opt => (
                <div key={opt.id} className="group/opt flex items-center px-3 py-1.5 hover:bg-accent transition-colors">
                    <button
                        className="flex-1 flex items-center gap-2 text-xs text-left"
                        onMouseDown={e => e.preventDefault()} onClick={() => onSelect(opt.id)}
                    >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
                        <span className="font-medium truncate" style={{ color: opt.color }}>{opt.label}</span>
                        {value === opt.id && <Check className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: opt.color }} />}
                    </button>
                    <button
                        className="opacity-0 group-hover/opt:opacity-100 transition-opacity ml-1 flex-shrink-0"
                        onMouseDown={e => e.preventDefault()} onClick={() => onRemoveOption(opt.id)}
                    >
                        <X className="w-3 h-3 text-muted-foreground/60 hover:text-destructive" />
                    </button>
                </div>
            ))}
            <div className="px-3 pt-1.5 pb-1 border-t border-border/60 mt-0.5 flex items-center gap-1">
                <input
                    ref={inputRef}
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commit() }}
                    placeholder="Add option…"
                    className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/40"
                />
                {newLabel && (
                    <button onMouseDown={e => e.preventDefault()} onClick={commit}>
                        <Plus className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                )}
            </div>
        </div>
    )
}

// ── MultiSelectPopup ───────────────────────────────────────────────────────────

function MultiSelectPopup({ opts, selected, onToggle, onAddOption, onRemoveOption }: {
    opts: PropertyOption[]
    selected: string[]
    onToggle: (id: string) => void
    onAddOption: (label: string) => void
    onRemoveOption: (id: string) => void
}) {
    const [newLabel, setNewLabel] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    useEffect(() => { inputRef.current?.focus() }, [])

    function commit() {
        if (newLabel.trim()) { onAddOption(newLabel.trim()); setNewLabel('') }
    }

    return (
        <div className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border border-border bg-popover shadow-xl overflow-hidden py-1">
            {opts.map(opt => (
                <div key={opt.id} className="group/opt flex items-center px-3 py-1.5 hover:bg-accent transition-colors">
                    <button
                        className="flex-1 flex items-center gap-2 text-xs text-left"
                        onMouseDown={e => e.preventDefault()} onClick={() => onToggle(opt.id)}
                    >
                        <div
                            className={cn('w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                                selected.includes(opt.id) ? '' : 'border-border')}
                            style={selected.includes(opt.id) ? { background: opt.color + '22', borderColor: opt.color } : {}}
                        >
                            {selected.includes(opt.id) && <Check className="w-2 h-2" style={{ color: opt.color }} />}
                        </div>
                        <span className="font-medium truncate" style={{ color: opt.color }}>{opt.label}</span>
                    </button>
                    <button
                        className="opacity-0 group-hover/opt:opacity-100 transition-opacity ml-1 flex-shrink-0"
                        onMouseDown={e => e.preventDefault()} onClick={() => onRemoveOption(opt.id)}
                    >
                        <X className="w-3 h-3 text-muted-foreground/60 hover:text-destructive" />
                    </button>
                </div>
            ))}
            <div className="px-3 pt-1.5 pb-1 border-t border-border/60 mt-0.5 flex items-center gap-1">
                <input
                    ref={inputRef}
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commit() }}
                    placeholder="Add option…"
                    className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/40"
                />
                {newLabel && (
                    <button onMouseDown={e => e.preventDefault()} onClick={commit}>
                        <Plus className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                )}
            </div>
        </div>
    )
}

// ── PersonMultiPopup ───────────────────────────────────────────────────────────

function PersonMultiPopup({ people, selected, onToggle }: {
    people: Person[]
    selected: string[]
    onToggle: (id: string) => void
}) {
    return (
        <div className="absolute z-50 top-full left-0 mt-1 w-48 rounded-xl border border-border bg-popover shadow-xl overflow-hidden py-1">
            {people.length === 0
                ? <p className="px-3 py-2 text-xs text-muted-foreground/50">No people yet</p>
                : people.map(p => (
                    <button
                        key={p.id}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => onToggle(p.id)}
                    >
                        <div className={cn(
                            'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                            selected.includes(p.id) ? 'bg-indigo-500/20 border-indigo-400' : 'border-border'
                        )}>
                            {selected.includes(p.id) && <Check className="w-2 h-2 text-indigo-500" />}
                        </div>
                        <UserCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground flex-1 truncate">{p.name}</span>
                    </button>
                ))
            }
        </div>
    )
}

// ── PropValue ──────────────────────────────────────────────────────────────────

// ── Modern Property Date Picker ────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December']
const DAY_NAMES_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa']

function toIsoDate(y: number, m: number, d: number) {
    return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function PropertyDatePicker({ anchorEl, value, onChange, onClose }: {
    anchorEl: HTMLElement | null
    value: string
    onChange: (iso: string | null) => void
    onClose: () => void
}) {
    const today = new Date()
    const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate())
    const parsed = value ? new Date(value + 'T12:00:00') : today
    const [viewYear, setViewYear] = useState(parsed.getFullYear())
    const [viewMonth, setViewMonth] = useState(parsed.getMonth())
    const [showYearInput, setShowYearInput] = useState(false)
    const [yearInputVal, setYearInputVal] = useState(String(parsed.getFullYear()))
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const pickerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!anchorEl) return
        const r = anchorEl.getBoundingClientRect()
        const pickerW = 248, pickerH = 280
        let top = r.bottom + 6
        let left = r.left
        if (top + pickerH > window.innerHeight - 12) top = r.top - pickerH - 6
        if (left + pickerW > window.innerWidth - 12) left = window.innerWidth - pickerW - 12
        setPos({ top, left })
    }, [anchorEl])

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose()
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
    }, [onClose])

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDow = new Date(viewYear, viewMonth, 1).getDay()
    const cells: (number | null)[] = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null)

    return ReactDOM.createPortal(
        <div
            ref={pickerRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
            className="w-[248px] rounded-2xl border border-border/60 bg-popover shadow-2xl shadow-black/20 overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
                <button
                    onClick={prevMonth}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                    {/* Month selector */}
                    <select
                        value={viewMonth}
                        onChange={e => setViewMonth(Number(e.target.value))}
                        className="text-sm font-semibold bg-transparent outline-none cursor-pointer hover:text-primary transition-colors text-foreground appearance-none text-center"
                    >
                        {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>

                    {/* Year — click to edit inline */}
                    {showYearInput ? (
                        <input
                            autoFocus
                            type="number"
                            value={yearInputVal}
                            onChange={e => setYearInputVal(e.target.value)}
                            onBlur={() => {
                                const y = parseInt(yearInputVal)
                                if (!isNaN(y) && y > 1000 && y < 3000) setViewYear(y)
                                else setYearInputVal(String(viewYear))
                                setShowYearInput(false)
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                if (e.key === 'Escape') { setYearInputVal(String(viewYear)); setShowYearInput(false) }
                            }}
                            className="w-14 text-sm font-semibold bg-muted/60 rounded px-1 outline-none text-center text-foreground tabular-nums"
                        />
                    ) : (
                        <button
                            onClick={() => { setYearInputVal(String(viewYear)); setShowYearInput(true) }}
                            className="text-sm font-semibold hover:text-primary transition-colors text-foreground tabular-nums"
                        >
                            {viewYear}
                        </button>
                    )}
                </div>

                <button
                    onClick={nextMonth}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-2 mb-0.5">
                {DAY_NAMES_SHORT.map(d => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground/60 py-1 tracking-wide">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0 px-2 pb-2">
                {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />
                    const iso = toIsoDate(viewYear, viewMonth, day)
                    const isSelected = iso === value
                    const isToday = iso === todayIso
                    return (
                        <button
                            key={iso}
                            onClick={() => { onChange(iso); onClose() }}
                            className={cn(
                                'relative h-8 w-full text-xs rounded-lg font-medium transition-all duration-100 flex items-center justify-center',
                                isSelected
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : isToday
                                        ? 'text-primary hover:bg-primary/10'
                                        : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {day}
                            {isToday && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
                <button
                    onClick={() => { onChange(todayIso); onClose() }}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                    Today
                </button>
                {value && (
                    <button
                        onClick={() => { onChange(null); onClose() }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>
        </div>,
        document.body
    )
}

function PropValue({ prop, people, onUpdate }: {
    prop: NoteProperty
    people: Person[]
    onUpdate: (patch: Partial<NoteProperty>) => void
}) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    useClickOutside(wrapRef, () => setOpen(false), open)

    // ── Checkbox ──────────────────────────────────────────────────────────────
    if (prop.type === 'checkbox') {
        return (
            <button className="flex items-center" onClick={() => onUpdate({ value: !prop.value })}>
                <div className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                    prop.value ? 'bg-primary border-primary' : 'border-border hover:border-primary/50'
                )}>
                    {prop.value && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
            </button>
        )
    }

    // ── Date ──────────────────────────────────────────────────────────────────
    if (prop.type === 'date') {
        const raw = typeof prop.value === 'string' ? prop.value : ''
        const display = raw
            ? new Date(raw + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : ''
        return (
            <>
                <button
                    ref={triggerRef}
                    onClick={() => setOpen(o => !o)}
                    className={cn(
                        'flex items-center gap-1.5 text-xs rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors',
                        'hover:bg-muted/60 group/date',
                        display ? 'text-foreground' : 'text-muted-foreground/40',
                    )}
                >
                    <Calendar className="w-3 h-3 opacity-50 group-hover/date:opacity-80 transition-opacity flex-shrink-0" />
                    <span>{display || 'Empty'}</span>
                </button>
                {open && (
                    <PropertyDatePicker
                        anchorEl={triggerRef.current}
                        value={raw}
                        onChange={v => onUpdate({ value: v })}
                        onClose={() => setOpen(false)}
                    />
                )}
            </>
        )
    }

    // ── Text / Number / URL / Email / Phone ───────────────────────────────────
    if (['text', 'number', 'url', 'email', 'phone'].includes(prop.type)) {
        const str = prop.value !== null && prop.value !== undefined ? String(prop.value) : ''
        const htmlType = prop.type === 'number' ? 'number' : prop.type === 'email' ? 'email' : prop.type === 'phone' ? 'tel' : prop.type === 'url' ? 'url' : 'text'
        return (
            <div className="flex items-center gap-1 group/txt min-w-0">
                <input
                    type={htmlType}
                    value={str}
                    onChange={e => onUpdate({
                        value: prop.type === 'number'
                            ? (e.target.value === '' ? null : Number(e.target.value))
                            : (e.target.value || null)
                    })}
                    placeholder="Empty"
                    className="flex-1 min-w-0 text-xs bg-transparent outline-none placeholder:text-muted-foreground/30 text-foreground"
                />
                {prop.type === 'url' && str && (
                    <a
                        href={str.startsWith('http') ? str : `https://${str}`}
                        target="_blank" rel="noopener noreferrer"
                        className="opacity-0 group-hover/txt:opacity-100 transition-opacity flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                    >
                        <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </a>
                )}
            </div>
        )
    }

    // ── Select ────────────────────────────────────────────────────────────────
    if (prop.type === 'select') {
        const opts = prop.options ?? []
        const sel = opts.find(o => o.id === prop.value)
        return (
            <div className="relative" ref={wrapRef}>
                <button
                    className="flex items-center text-xs text-left"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setOpen(v => !v)}
                >
                    {sel
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border" style={chipStyle(sel.color)}>{sel.label}</span>
                        : <span className="text-muted-foreground/30">Empty</span>
                    }
                </button>
                {open && (
                    <SelectPopup
                        opts={opts}
                        value={typeof prop.value === 'string' ? prop.value : null}
                        onSelect={id => { onUpdate({ value: id }); setOpen(false) }}
                        onClear={() => { onUpdate({ value: null }); setOpen(false) }}
                        onAddOption={label => {
                            const color = OPTION_COLORS[opts.length % OPTION_COLORS.length]
                            onUpdate({ options: [...opts, { id: uid(), label, color }] })
                        }}
                        onRemoveOption={id => onUpdate({
                            options: opts.filter(o => o.id !== id),
                            value: prop.value === id ? null : prop.value,
                        })}
                    />
                )}
            </div>
        )
    }

    // ── Multi-select ──────────────────────────────────────────────────────────
    if (prop.type === 'multi_select') {
        const opts = prop.options ?? []
        const selIds = Array.isArray(prop.value) ? (prop.value as string[]) : []
        const selOpts = opts.filter(o => selIds.includes(o.id))
        return (
            <div className="relative" ref={wrapRef}>
                <button
                    className="flex items-center gap-1 flex-wrap text-left"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setOpen(v => !v)}
                >
                    {selOpts.length > 0
                        ? selOpts.map(o => (
                            <span key={o.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border" style={chipStyle(o.color)}>{o.label}</span>
                        ))
                        : <span className="text-xs text-muted-foreground/30">Empty</span>
                    }
                </button>
                {open && (
                    <MultiSelectPopup
                        opts={opts}
                        selected={selIds}
                        onToggle={id => {
                            const next = selIds.includes(id) ? selIds.filter(v => v !== id) : [...selIds, id]
                            onUpdate({ value: next })
                        }}
                        onAddOption={label => {
                            const color = OPTION_COLORS[opts.length % OPTION_COLORS.length]
                            onUpdate({ options: [...opts, { id: uid(), label, color }] })
                        }}
                        onRemoveOption={id => onUpdate({
                            options: opts.filter(o => o.id !== id),
                            value: selIds.filter(v => v !== id),
                        })}
                    />
                )}
            </div>
        )
    }

    // ── Person (multi) ────────────────────────────────────────────────────────
    if (prop.type === 'person') {
        const selIds = Array.isArray(prop.value) ? (prop.value as string[]) : (prop.value ? [prop.value as string] : [])
        const selPeople = people.filter(p => selIds.includes(p.id))
        return (
            <div className="relative" ref={wrapRef}>
                <button
                    className="flex items-center gap-1 flex-wrap text-left"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => setOpen(v => !v)}
                >
                    {selPeople.length > 0
                        ? selPeople.map(p => (
                            <span key={p.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                                <UserCircle className="w-3 h-3 flex-shrink-0" />
                                {p.name}
                            </span>
                        ))
                        : <span className="text-xs text-muted-foreground/30">Empty</span>
                    }
                </button>
                {open && (
                    <PersonMultiPopup
                        people={people}
                        selected={selIds}
                        onToggle={id => {
                            const next = selIds.includes(id) ? selIds.filter(v => v !== id) : [...selIds, id]
                            onUpdate({ value: next })
                        }}
                    />
                )}
            </div>
        )
    }

    return null
}

// ── PropertyRow ────────────────────────────────────────────────────────────────

function PropertyRow({ prop, people, onUpdate, onDelete }: {
    prop: NoteProperty
    people: Person[]
    onUpdate: (patch: Partial<NoteProperty>) => void
    onDelete: () => void
}) {
    const [editingName, setEditingName] = useState(false)
    const [nameVal, setNameVal] = useState(prop.name)
    const [showTypeMenu, setShowTypeMenu] = useState(false)
    const typeMenuRef = useRef<HTMLDivElement>(null)
    const nameRef = useRef<HTMLInputElement>(null)

    useEffect(() => { if (!editingName) setNameVal(prop.name) }, [prop.name, editingName])
    useEffect(() => { if (editingName) nameRef.current?.select() }, [editingName])
    useClickOutside(typeMenuRef, () => setShowTypeMenu(false), showTypeMenu)

    function commitName() {
        onUpdate({ name: nameVal.trim() || prop.name })
        setEditingName(false)
    }

    const { Icon } = TYPE_META[prop.type]

    return (
        <div className="group/row relative flex items-start min-h-[30px] rounded-md px-1 hover:bg-accent/30 transition-colors">
            {/* ── Left: type icon + name (fixed 148 px) ── */}
            <div className="flex items-center gap-1 w-[148px] shrink-0 py-[5px] pr-2">
                {/* Type icon — click to change type */}
                <div className="relative flex-shrink-0" ref={typeMenuRef}>
                    <button
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-muted-foreground"
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setShowTypeMenu(v => !v)}
                        title={`${TYPE_META[prop.type].label} — click to change type`}
                    >
                        <Icon className="w-3 h-3" />
                    </button>
                    {showTypeMenu && (
                        <TypePickerMenu
                            onSelect={type => {
                                onUpdate({
                                    type,
                                    value: defaultValue(type),
                                    options: type === 'select' || type === 'multi_select'
                                        ? (prop.options ?? [])
                                        : undefined,
                                })
                                setShowTypeMenu(false)
                            }}
                            onClose={() => setShowTypeMenu(false)}
                        />
                    )}
                </div>
                {/* Property name */}
                {editingName ? (
                    <input
                        ref={nameRef}
                        value={nameVal}
                        onChange={e => setNameVal(e.target.value)}
                        onBlur={commitName}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); commitName() }
                            if (e.key === 'Escape') { setNameVal(prop.name); setEditingName(false) }
                        }}
                        className="flex-1 min-w-0 text-xs bg-transparent outline-none text-foreground font-medium"
                    />
                ) : (
                    <button
                        className="flex-1 min-w-0 text-left text-xs text-muted-foreground hover:text-foreground transition-colors truncate font-medium py-0.5"
                        onClick={() => setEditingName(true)}
                    >
                        {prop.name}
                    </button>
                )}
            </div>

            {/* ── Right: value (flex fill) ── */}
            <div className="flex-1 min-w-0 py-[5px] pr-7">
                <PropValue prop={prop} people={people} onUpdate={onUpdate} />
            </div>

            {/* Delete button — visible on row hover */}
            <button
                className="absolute right-1 top-[5px] opacity-0 group-hover/row:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/15 text-muted-foreground/40 hover:text-destructive"
                onClick={onDelete}
                title="Remove property"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    )
}

// ── NoteProperties (main export) ───────────────────────────────────────────────

export interface NotePropertiesProps {
    properties: NoteProperty[]
    people: Person[]
    onChange: (properties: NoteProperty[]) => void
}

export function NoteProperties({ properties, people, onChange }: NotePropertiesProps) {
    const [showTypeMenu, setShowTypeMenu] = useState(false)
    const addRef = useRef<HTMLDivElement>(null)
    useClickOutside(addRef, () => setShowTypeMenu(false), showTypeMenu)

    function addProperty(type: PropertyType) {
        const prop: NoteProperty = {
            id: uid(),
            name: TYPE_META[type].label,
            type,
            value: defaultValue(type),
            options: type === 'select' || type === 'multi_select' ? [] : undefined,
        }
        onChange([...properties, prop])
        setShowTypeMenu(false)
    }

    function deleteProperty(id: string) {
        onChange(properties.filter(p => p.id !== id))
    }

    function updateProperty(id: string, patch: Partial<NoteProperty>) {
        onChange(properties.map(p => p.id === id ? { ...p, ...patch } : p))
    }

    return (
        <div className="w-full mb-5">
            {properties.map(prop => (
                <PropertyRow
                    key={prop.id}
                    prop={prop}
                    people={people}
                    onUpdate={patch => updateProperty(prop.id, patch)}
                    onDelete={() => deleteProperty(prop.id)}
                />
            ))}

            {/* Add property */}
            <div ref={addRef} className="relative mt-0.5">
                <button
                    className={cn(
                        'flex items-center gap-1.5 pl-[26px] py-1 text-xs rounded-md transition-colors',
                        'text-muted-foreground/35 hover:text-muted-foreground/70 hover:bg-accent/30',
                    )}
                    onClick={() => setShowTypeMenu(v => !v)}
                >
                    <Plus className="w-3 h-3" />
                    <span>Add property</span>
                </button>
                {showTypeMenu && (
                    <TypePickerMenu onSelect={addProperty} onClose={() => setShowTypeMenu(false)} />
                )}
            </div>
        </div>
    )
}
