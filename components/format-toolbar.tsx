import React, { useState, useEffect, useCallback } from "react"
import { Bold, Italic, Strikethrough, Palette, Underline, X } from "lucide-react"

export function FormatToolbar() {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
    const [showColors, setShowColors] = useState(false)

    const updatePosition = useCallback(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            setPosition(null)
            setShowColors(false)
            return
        }
        const range = sel.getRangeAt(0)
        // Only show toolbar if selection is inside a contenteditable
        let node = range.startContainer as HTMLElement | null
        if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement
        if (!node || node.closest('[contenteditable="false"]') || !node.closest('[contenteditable="true"]')) {
            setPosition(null)
            setShowColors(false)
            return
        }
        const rect = range.getBoundingClientRect()
        setPosition({
            top: rect.top - 40,
            left: rect.left + rect.width / 2
        })
    }, [])

    useEffect(() => {
        document.addEventListener('selectionchange', updatePosition)
        return () => document.removeEventListener('selectionchange', updatePosition)
    }, [updatePosition])

    if (!position) return null

    const exec = (cmd: string, val?: string) => {
        document.execCommand(cmd, false, val)
        // Keep focus and selection
        setTimeout(updatePosition, 10)
    }

    const TEXT_COLORS = [
        { label: 'Default', value: 'inherit' },
        { label: 'Gray', value: '#6b7280' },
        { label: 'Red', value: '#ef4444' },
        { label: 'Orange', value: '#f97316' },
        { label: 'Yellow', value: '#eab308' },
        { label: 'Green', value: '#22c55e' },
        { label: 'Blue', value: '#3b82f6' },
        { label: 'Purple', value: '#a855f7' },
        { label: 'Pink', value: '#ec4899' },
    ]
    const HIGHLIGHT_COLORS = [
        { label: 'Default', value: 'transparent' },
        { label: 'Gray', value: 'rgba(107,114,128,0.2)' },
        { label: 'Red', value: 'rgba(239,68,68,0.2)' },
        { label: 'Orange', value: 'rgba(249,115,22,0.2)' },
        { label: 'Yellow', value: 'rgba(234,179,8,0.2)' },
        { label: 'Green', value: 'rgba(34,197,94,0.2)' },
        { label: 'Blue', value: 'rgba(59,130,246,0.2)' },
        { label: 'Purple', value: 'rgba(168,85,247,0.2)' },
        { label: 'Pink', value: 'rgba(236,72,153,0.2)' },
    ]

    return (
        <div
            className="fixed z-50 transform -translate-x-1/2 flex items-center bg-popover border shadow-lg rounded-md px-1 py-1 gap-0.5"
            style={{ top: Math.max(10, position.top), left: position.left }}
            onMouseDown={e => e.preventDefault()} // Keep selection
        >
            {!showColors ? (
                <>
                    <button onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Bold (Cmd+B)"><Bold className="w-4 h-4" /></button>
                    <button onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Italic (Cmd+I)"><Italic className="w-4 h-4" /></button>
                    <button onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Underline (Cmd+U)"><Underline className="w-4 h-4" /></button>
                    <button onMouseDown={e => e.preventDefault()} onClick={() => exec('strikeThrough')} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors" title="Strikethrough (Cmd+Shift+S)"><Strikethrough className="w-4 h-4" /></button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button onMouseDown={e => e.preventDefault()} onClick={() => setShowColors(true)} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors relative" title="Text Color & Highlight">
                        <Palette className="w-4 h-4" />
                    </button>
                </>
            ) : (
                <div className="flex flex-col gap-2 px-2 py-1 select-none">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Color</span>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => setShowColors(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="flex gap-1">
                        {TEXT_COLORS.map(c => (
                            <button key={`t-${c.label}`} onMouseDown={e => e.preventDefault()} onClick={() => { exec('foreColor', c.value); setShowColors(false) }}
                                className="w-5 h-5 rounded-full border border-border/50 hover:scale-110 transition-transform flex items-center justify-center"
                                style={{ color: c.value === 'inherit' ? 'currentColor' : c.value }} title={c.label}>
                                <span className="text-[10px] font-bold">A</span>
                            </button>
                        ))}
                    </div>
                    <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider mt-1">Background</span>
                    <div className="flex gap-1 pb-1">
                        {HIGHLIGHT_COLORS.map(c => (
                            <button key={`h-${c.label}`} onMouseDown={e => e.preventDefault()} onClick={() => { exec('hiliteColor', c.value); setShowColors(false) }}
                                className="w-5 h-5 rounded border border-border/50 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c.value }} title={c.label} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
