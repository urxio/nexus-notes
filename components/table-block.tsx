"use client"
import React, { useRef, useEffect, useState } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Block } from "@/lib/types"

// ── helpers ───────────────────────────────────────────────────────────────────

function parse(content: string): string[][] {
    if (!content?.trim()) return [['', '', ''], ['', '', '']]
    return content.split('\n').map(r => r.split('|'))
}

function normalize(rows: string[][], cols: number): string[][] {
    return rows.map(r => {
        const p = [...r]
        while (p.length < cols) p.push('')
        return p.slice(0, cols)
    })
}

function serialize(rows: string[][]): string {
    return rows.map(r => r.join('|')).join('\n')
}

function numCols(rows: string[][]): number {
    return Math.max(...rows.map(r => r.length), 1)
}

// ── single editable cell ──────────────────────────────────────────────────────

interface CellProps {
    value: string
    isHeader: boolean
    onChange: (v: string) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
    onFocus: () => void
}

function Cell({ value, isHeader, onChange, onKeyDown, onFocus }: CellProps) {
    const ref = useRef<HTMLDivElement>(null)

    // Sync content from outside (e.g. add/remove row or col) without clobbering
    // a cell the user is actively editing.
    useEffect(() => {
        const el = ref.current
        if (!el || document.activeElement === el) return
        if (el.textContent !== value) el.textContent = value
    }, [value])

    return (
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            data-cell
            className={cn(
                "outline-none min-w-[80px] px-2.5 py-2 text-sm whitespace-pre-wrap",
                isHeader && "font-semibold"
            )}
            onInput={e => onChange(e.currentTarget.textContent ?? '')}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
        />
    )
}

// ── main component ────────────────────────────────────────────────────────────

interface TableBlockProps {
    block: Block
    onUpdate: (id: string, patch: Partial<Block>) => void
    onFocus: (id: string) => void
}

export function TableBlock({ block, onUpdate, onFocus: focusBlock }: TableBlockProps) {
    const rawRows = parse(block.content)
    const cols = numCols(rawRows)
    const rows = normalize(rawRows, cols)
    const numRows = rows.length

    const [hovRow, setHovRow] = useState<number | null>(null)
    const [hovCol, setHovCol] = useState<number | null>(null)
    const tableRef = useRef<HTMLTableElement>(null)

    // ── data mutations ────────────────────────────────────────────────────────

    function commit(r: number, c: number, v: string) {
        const next = rows.map(row => [...row])
        next[r][c] = v
        onUpdate(block.id, { content: serialize(next) })
    }

    function addRow() {
        const next = [...rows, Array(cols).fill('')]
        onUpdate(block.id, { content: serialize(next) })
        setTimeout(() => focusCell(numRows, 0), 30)
    }

    function addCol() {
        const next = rows.map(r => [...r, ''])
        onUpdate(block.id, { content: serialize(next) })
        setTimeout(() => focusCell(0, cols), 30)
    }

    function delRow(r: number) {
        if (numRows <= 1) return
        const next = rows.filter((_, i) => i !== r)
        onUpdate(block.id, { content: serialize(next) })
    }

    function delCol(c: number) {
        if (cols <= 1) return
        const next = rows.map(r => r.filter((_, i) => i !== c))
        onUpdate(block.id, { content: serialize(next) })
    }

    // ── navigation ───────────────────────────────────────────────────────────

    /** Focus a specific cell by row/col position. Queries per-row to avoid
     *  stride issues when col count changes across re-renders. */
    function focusCell(r: number, c: number) {
        if (!tableRef.current) return
        const tbody = tableRef.current.querySelector('tbody')
        const row = tbody?.querySelectorAll('tr')[r]
        const cell = row?.querySelectorAll<HTMLDivElement>('[data-cell]')[c]
        cell?.focus()
    }

    function cellKeyDown(r: number, c: number, e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Tab') {
            e.preventDefault()
            if (!e.shiftKey) {
                if (c < cols - 1) focusCell(r, c + 1)
                else if (r < numRows - 1) focusCell(r + 1, 0)
                else addRow()                   // Tab past last cell → new row
            } else {
                if (c > 0) focusCell(r, c - 1)
                else if (r > 0) focusCell(r - 1, cols - 1)
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (r < numRows - 1) focusCell(r + 1, c)
            else addRow()                       // Enter on last row → new row
        }
    }

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div
            className="inline-flex items-start gap-1.5 select-none"
            onMouseLeave={() => { setHovRow(null); setHovCol(null) }}
        >
            <div className="border border-border rounded-lg overflow-hidden bg-background/80 shadow-sm">
                <table ref={tableRef} className="border-collapse">
                    {/* Thin header row — shows per-column delete buttons on hover */}
                    <thead>
                        <tr>
                            {rows[0].map((_, c) => (
                                <th
                                    key={c}
                                    className={cn(
                                        "p-0 border-b border-border transition-colors",
                                        hovCol === c && "bg-destructive/8"
                                    )}
                                    onMouseEnter={() => setHovCol(c)}
                                >
                                    <button
                                        className={cn(
                                            "flex items-center justify-center w-full py-0.5 transition-opacity",
                                            hovCol === c ? "opacity-100" : "opacity-0 pointer-events-none"
                                        )}
                                        onMouseDown={e => { e.preventDefault(); delCol(c) }}
                                        title="Delete column"
                                    >
                                        <X className="w-3 h-3 text-destructive/70" />
                                    </button>
                                </th>
                            ))}
                            <th className="p-0 w-0" /> {/* spacer for row delete column */}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, r) => (
                            <tr
                                key={r}
                                onMouseEnter={() => setHovRow(r)}
                                className={cn(r === 0 && "bg-muted/40")}
                            >
                                {row.map((cell, c) => (
                                    <td
                                        key={c}
                                        className={cn(
                                            "border border-border align-top transition-colors",
                                            hovCol === c && r > 0 && "bg-muted/20",
                                            hovRow === r && r > 0 && "bg-muted/20",
                                            hovCol === c && hovRow === r && r > 0 && "bg-muted/35"
                                        )}
                                        onMouseEnter={() => setHovCol(c)}
                                    >
                                        <Cell
                                            value={cell}
                                            isHeader={r === 0}
                                            onChange={v => commit(r, c, v)}
                                            onKeyDown={e => cellKeyDown(r, c, e)}
                                            onFocus={() => focusBlock(block.id)}
                                        />
                                    </td>
                                ))}

                                {/* Per-row delete button */}
                                <td className="border-0 pl-1.5 w-6 align-middle">
                                    <button
                                        className={cn(
                                            "w-5 h-5 flex items-center justify-center rounded transition-all",
                                            "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10",
                                            hovRow === r ? "opacity-100" : "opacity-0 pointer-events-none"
                                        )}
                                        onMouseDown={e => { e.preventDefault(); delRow(r) }}
                                        title="Delete row"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Add row */}
                <button
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors border-t border-border"
                    onMouseDown={e => { e.preventDefault(); addRow() }}
                >
                    <Plus className="w-3 h-3" />
                    Add row
                </button>
            </div>

            {/* Add column */}
            <button
                className="self-stretch flex items-center justify-center px-2 rounded-lg border border-border/60 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 hover:border-border transition-colors min-h-[36px]"
                onMouseDown={e => { e.preventDefault(); addCol() }}
                title="Add column"
            >
                <Plus className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
