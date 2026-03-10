"use client"
import React, { useState, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toIso(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface Props {
    /** Bounding rect of the date chip that was clicked — used for positioning. */
    anchorRect: DOMRect
    /** Currently stored YYYY-MM-DD value shown as selected in the grid. */
    initialDate: string
    onSelect: (date: string) => void
    onClose: () => void
}

export function InlineDatePicker({ anchorRect, initialDate, onSelect, onClose }: Props) {
    const today = new Date()
    const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate())

    const parsed = initialDate ? new Date(initialDate + 'T12:00:00') : today
    const [viewYear, setViewYear] = useState(parsed.getFullYear())
    const [viewMonth, setViewMonth] = useState(parsed.getMonth())
    const pickerRef = useRef<HTMLDivElement>(null)

    // Close on outside mousedown
    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [onClose])

    function prevYear() { setViewYear(y => y - 1) }
    function nextYear() { setViewYear(y => y + 1) }
    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
        else setViewMonth(m => m - 1)
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
        else setViewMonth(m => m + 1)
    }

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
    const cells: (number | null)[] = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    // Keep picker within viewport
    const top = Math.min(anchorRect.bottom + 6, window.innerHeight - 320)
    const left = Math.min(anchorRect.left, window.innerWidth - 270)

    return ReactDOM.createPortal(
        <div
            ref={pickerRef}
            style={{ position: 'fixed', top, left, zIndex: 9999 }}
            className="bg-popover border border-border rounded-xl shadow-xl p-3 w-64"
            // Prevent mousedown from propagating (e.g. triggering outside-click on block)
            onMouseDown={e => e.stopPropagation()}
        >
            {/* Year + month navigation */}
            <div className="flex items-center justify-between mb-2 gap-0.5">
                <button onClick={prevYear} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Previous year">
                    <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={prevMonth} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Previous month">
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-semibold flex-1 text-center tabular-nums">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Next month">
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={nextYear} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Next year">
                    <ChevronsRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Day headers */}
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
                    const isSelected = iso === initialDate
                    const isToday = iso === todayIso
                    return (
                        <button
                            key={i}
                            onClick={() => { onSelect(iso); onClose() }}
                            className={cn(
                                'text-xs rounded py-1 w-full text-center transition-colors',
                                isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent text-foreground',
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
                <button onClick={() => { onSelect(todayIso); onClose() }} className="text-xs text-primary hover:underline">
                    Today
                </button>
            </div>
        </div>,
        document.body
    )
}
