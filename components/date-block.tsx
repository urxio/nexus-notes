import React, { useState, useRef, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Block } from "@/lib/types"

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toIso(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function DateBlock({ block, onUpdate }: { block: Block; onUpdate: (id: string, patch: Partial<Block>) => void }) {
    const today = new Date()
    const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate())

    // Auto-open the picker when the block is freshly created (no date chosen yet)
    const [open, setOpen] = useState(false)
    const [viewYear, setViewYear] = useState(today.getFullYear())
    const [viewMonth, setViewMonth] = useState(today.getMonth())
    const containerRef = useRef<HTMLDivElement>(null)

    // If no date stored yet, calendar shows today's month but nothing is selected
    const dateVal = block.content || ''

    // Keep calendar view in sync with the selected date whenever it changes
    useEffect(() => {
        if (!dateVal) return
        const d = new Date(dateVal + 'T12:00:00')
        setViewYear(d.getFullYear())
        setViewMonth(d.getMonth())
    }, [dateVal])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        function onDown(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    const displayDate = dateVal ? (() => {
        try {
            return new Date(dateVal + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })
        } catch { return dateVal }
    })() : 'Pick a date…'

    function prevYear()  { setViewYear(y => y - 1) }
    function nextYear()  { setViewYear(y => y + 1) }
    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    function selectDay(day: number) {
        onUpdate(block.id, { content: toIso(viewYear, viewMonth, day) })
        setOpen(false)
    }

    function goToday() {
        onUpdate(block.id, { content: todayIso })
        setOpen(false)
    }

    // Build the calendar grid cells
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
    const cells: (number | null)[] = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    return (
        <div ref={containerRef} className="relative inline-flex items-center gap-2 py-1.5 group select-none" onClick={e => e.stopPropagation()}>
            <Calendar className="w-4 h-4 text-primary/70 flex-shrink-0" />

            <button
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "text-sm font-medium hover:underline decoration-dotted underline-offset-2 cursor-pointer",
                    dateVal ? "text-primary/80" : "text-muted-foreground/60 italic"
                )}
            >
                {displayDate}
            </button>

            {dateVal && (
                <span className="text-xs text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    click to edit
                </span>
            )}

            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-xl p-3 w-64">

                    {/* Year + month navigation */}
                    <div className="flex items-center justify-between mb-2 gap-0.5">
                        <button onClick={prevYear}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Previous year">
                            <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={prevMonth}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Previous month">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-sm font-semibold flex-1 text-center tabular-nums">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </span>

                        <button onClick={nextMonth}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Next month">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={nextYear}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Next year">
                            <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAY_NAMES.map(d => (
                            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{d}</div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-0.5">
                        {cells.map((day, i) => {
                            if (!day) return <div key={i} />
                            const iso = toIso(viewYear, viewMonth, day)
                            const isSelected = !!dateVal && iso === dateVal
                            const isToday = iso === todayIso
                            return (
                                <button key={i} onClick={() => selectDay(day)}
                                    className={cn(
                                        'text-xs rounded py-1 w-full text-center transition-colors',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'hover:bg-accent text-foreground',
                                        isToday && !isSelected && 'font-bold text-primary',
                                    )}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>

                    {/* Footer */}
                    <div className="mt-2 pt-2 border-t border-border text-center">
                        <button onClick={goToday} className="text-xs text-primary hover:underline">
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
