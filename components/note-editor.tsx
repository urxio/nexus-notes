import React, { useState, useRef, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { Plus, Search, Trash2, X, ChevronRight, BookOpen, PanelLeftOpen, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Note, Person, ObjectType, Block, BlockType, NoteProperty } from "@/lib/types"
import { mkBlock, cloneBlock } from "@/lib/storage"
import { NOTE_ICON_KEYS } from "@/lib/constants"
import { NoteIcon } from "./note-icon"
import { FormatToolbar } from "./format-toolbar"
import { BlockItem } from "./block-item"
import { NoteProperties } from "./note-properties"

interface NoteEditorProps {
    note: Note
    allTags: string[]
    onChange: (noteId: string, updates: Partial<Note>) => void
    onDelete: (noteId: string) => void
    people: Person[]
    onCreatePerson: (name: string, typeId?: string) => Person
    onNavigateTo?: (noteId: string) => void
    /** Ordered history of notes visited to reach the current one (nearest-first = index 0). */
    navStack?: Note[]
    /** Called when a breadcrumb ancestor is clicked. null = "Notes" root. */
    onBreadcrumbNav?: (noteId: string | null) => void
    objectTypes: ObjectType[]
    deletedObjectTypes: string[]
    onCreateObjectType: (name: string, emoji: string) => ObjectType
    sidebarOpen?: boolean
    onToggleSidebar?: () => void
    notes?: Note[]
}

export function NoteEditor({ note, allTags, onChange, onDelete, people, onCreatePerson, onNavigateTo, navStack = [], onBreadcrumbNav, objectTypes, deletedObjectTypes, onCreateObjectType, sidebarOpen, onToggleSidebar, notes = [] }: NoteEditorProps) {
    const { toast } = useToast()
    const { resolvedTheme } = useTheme()
    const isTerminal = resolvedTheme === 'terminal'

    const wordCount = useMemo(() => {
        const text = note.blocks
            .map(b => b.content.replace(/<[^>]*>/g, ' '))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
        return text ? text.split(' ').filter(Boolean).length : 0
    }, [note.blocks])

    const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
    const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null)

    // ── Undo / Redo ─────────────────────────────────────────────────────────────
    // Two stacks: past (undo) and future (redo).
    // For text edits we debounce 800 ms and capture the pre-typing snapshot so
    // rapid typing collapses into one history entry.
    const pastRef = useRef<Block[][]>([])
    const futureRef = useRef<Block[][]>([])
    // Snapshot captured at the start of a typing burst (before any keys land)
    const preTypingRef = useRef<Block[] | null>(null)
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Immediate push – used for structural changes (add/delete/type/reorder)
    function pushHistory(snapshot: Block[]) {
        if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current)
            typingTimerRef.current = null
            preTypingRef.current = null
        }
        pastRef.current = [...pastRef.current, snapshot]
        futureRef.current = []
    }

    // Debounced push – used for keystroke-level content edits.
    // Saves the state from BEFORE the typing burst begins.
    function debouncedPushHistory(snapshot: Block[]) {
        if (!typingTimerRef.current) {
            preTypingRef.current = snapshot   // capture pre-typing state on first key
        } else {
            clearTimeout(typingTimerRef.current)
        }
        typingTimerRef.current = setTimeout(() => {
            if (preTypingRef.current) {
                pastRef.current = [...pastRef.current, preTypingRef.current]
                futureRef.current = []
                preTypingRef.current = null
            }
            typingTimerRef.current = null
        }, 800)
    }

    function undo() {
        // Blur the focused element so the BlockItem useEffect can update innerHTML
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        // Typing in progress — cancel the debounce and jump back to pre-typing state
        if (typingTimerRef.current && preTypingRef.current) {
            clearTimeout(typingTimerRef.current)
            typingTimerRef.current = null
            const previous = preTypingRef.current
            preTypingRef.current = null
            futureRef.current = [note.blocks, ...futureRef.current]
            onChange(note.id, { blocks: previous })
            return
        }
        if (pastRef.current.length === 0) return
        const previous = pastRef.current[pastRef.current.length - 1]
        pastRef.current = pastRef.current.slice(0, -1)
        futureRef.current = [note.blocks, ...futureRef.current]
        onChange(note.id, { blocks: previous })
    }

    function redo() {
        if (futureRef.current.length === 0) return
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
        const next = futureRef.current[0]
        pastRef.current = [...pastRef.current, note.blocks]
        futureRef.current = futureRef.current.slice(1)
        onChange(note.id, { blocks: next })
    }

    // Always-fresh refs so the global keydown handler (registered once) always
    // calls the latest undo/redo closure with current note.blocks.
    const undoRef = useRef(undo)
    const redoRef = useRef(redo)
    useEffect(() => {
        undoRef.current = undo
        redoRef.current = redo
    })
    const [tagInput, setTagInput] = useState('')
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const titleRef = useRef<HTMLTextAreaElement>(null)

    // Auto-focus first block when a fresh (single empty block) note is opened
    useEffect(() => {
        if (note.blocks.length === 1 && !note.blocks[0].content) {
            setFocusedBlockId(note.blocks[0].id)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Resize title textarea whenever the note changes (e.g. switching notes)
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto'
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
        }
    }, [note.id, note.title])

    function handleUpdateBlock(id: string, updates: Partial<Block>) {
        const next = note.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
        if ('type' in updates || 'checked' in updates) {
            pushHistory(note.blocks)
        } else {
            debouncedPushHistory(note.blocks)
        }
        onChange(note.id, { blocks: next })
    }

    function selectBlock(blockId: string, evt: React.MouseEvent) {
        const idx = note.blocks.findIndex(b => b.id === blockId)
        if (idx === -1) return

        if (evt.shiftKey && lastSelectedIdx !== null) {
            // Range select
            const ids = new Set<string>()
            for (let i = Math.min(idx, lastSelectedIdx); i <= Math.max(idx, lastSelectedIdx); i++) {
                ids.add(note.blocks[i].id)
            }
            setSelectedBlockIds(ids)
            setLastSelectedIdx(idx)
        } else if (evt.metaKey || evt.ctrlKey) {
            // Add/remove from selection
            const newSelection = new Set(selectedBlockIds)
            if (newSelection.has(blockId)) {
                newSelection.delete(blockId)
            } else {
                newSelection.add(blockId)
            }
            setSelectedBlockIds(newSelection)
            setLastSelectedIdx(idx)
        } else {
            // Single select
            setSelectedBlockIds(new Set([blockId]))
            setLastSelectedIdx(idx)
        }
    }

    // Ref: when set, the next focusedBlockId-change effect will place the cursor
    // at a specific position (and optionally sync DOM content) instead of start.
    const pendingCursorRef = useRef<{ id: string; pos: number; content?: string } | null>(null)

    // ── Block reorder drag ───────────────────────────────────────────────────
    const [reorderDragId, setReorderDragId] = useState<string | null>(null)
    const [reorderDropIdx, setReorderDropIdx] = useState<number | null>(null)
    const reorderRef = useRef<{ dragId: string | null; dropIdx: number | null }>({ dragId: null, dropIdx: null })

    function startReorderDrag(blockId: string) {
        reorderRef.current = { dragId: blockId, dropIdx: null }
        setReorderDragId(blockId)
        setFocusedBlockId(null)
        setSelectedBlockIds(new Set())
            ; (document.activeElement as HTMLElement)?.blur()
    }

    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!reorderRef.current.dragId) return
            const blockEls = Array.from(document.querySelectorAll('[data-block-id]'))
            let dropIdx = blockEls.length
            for (let i = 0; i < blockEls.length; i++) {
                const rect = blockEls[i].getBoundingClientRect()
                if (e.clientY < rect.top + rect.height / 2) { dropIdx = i; break }
            }
            reorderRef.current.dropIdx = dropIdx
            setReorderDropIdx(dropIdx)
        }
        function onMouseUp() {
            const { dragId, dropIdx } = reorderRef.current
            if (dragId !== null && dropIdx !== null) {
                const blocks = noteBlocksRef.current
                const fromIdx = blocks.findIndex(b => b.id === dragId)
                if (fromIdx !== -1 && dropIdx !== fromIdx && dropIdx !== fromIdx + 1) {
                    const newBlocks = [...blocks]
                    const [removed] = newBlocks.splice(fromIdx, 1)
                    const insertAt = dropIdx > fromIdx ? dropIdx - 1 : dropIdx
                    newBlocks.splice(insertAt, 0, removed)
                    pushHistory(newBlocks)
                    onChange(note.id, { blocks: newBlocks })
                }
            }
            reorderRef.current = { dragId: null, dropIdx: null }
            setReorderDragId(null)
            setReorderDropIdx(null)
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [onChange, pushHistory, note.id])

    // ── Arrow-key cross-block navigation ────────────────────────────────────
    function focusPrevBlock(id: string) {
        const idx = note.blocks.findIndex(b => b.id === id)
        if (idx <= 0) return
        const prev = note.blocks[idx - 1]
        if (prev.type === 'date' || prev.type === 'divider') { setFocusedBlockId(prev.id); return }
        pendingCursorRef.current = { id: prev.id, pos: prev.content.length }
        setFocusedBlockId(prev.id)
    }

    function focusNextBlock(id: string) {
        const idx = note.blocks.findIndex(b => b.id === id)
        if (idx >= note.blocks.length - 1) return
        const next = note.blocks[idx + 1]
        setFocusedBlockId(next.id)
    }

    function deleteBlock(id: string) {
        const idx = note.blocks.findIndex(b => b.id === id)
        const prev = note.blocks[idx - 1]
        const newBlocks = note.blocks.filter(b => b.id !== id)
        pushHistory(note.blocks)
        onChange(note.id, { blocks: newBlocks })
        if (prev) {
            // Place cursor at end of the previous block, not start
            pendingCursorRef.current = { id: prev.id, pos: prev.content.length }
            setFocusedBlockId(prev.id)
        }
        // Clear selection
        selectedBlockIds.delete(id)
        setSelectedBlockIds(new Set(selectedBlockIds))
    }

    // Merge blockId into its predecessor: append content to prev block's text,
    // delete blockId, and place cursor at the join point.
    function mergePrevBlock(blockId: string, content: string) {
        const idx = note.blocks.findIndex(b => b.id === blockId)
        if (idx <= 0) return
        const prev = note.blocks[idx - 1]
        if (prev.type === 'date' || prev.type === 'divider' || prev.type === 'toggle') return
        const mergedContent = prev.content + content
        const newBlocks = note.blocks
            .filter(b => b.id !== blockId)
            .map(b => b.id === prev.id ? { ...b, content: mergedContent } : b)
        pushHistory(newBlocks)
        onChange(note.id, { blocks: newBlocks })
        // cursor lands right at the join: after prev's original text
        pendingCursorRef.current = { id: prev.id, pos: prev.content.length, content: mergedContent }
        setFocusedBlockId(prev.id)
    }

    // Apply pending cursor position after React re-renders.
    // Runs whenever focusedBlockId changes — child (BlockItem) effects run first
    // (they place cursor at start), then this parent effect overrides to the
    // correct position. content is also synced here when a merge happened.
    useEffect(() => {
        const p = pendingCursorRef.current
        if (!p || p.id !== focusedBlockId) return
        pendingCursorRef.current = null

        const el = document.querySelector(
            `[data-block-id="${p.id}"] [contenteditable]`
        ) as HTMLElement | null
        if (!el) return

        // Sync DOM text if a merge changed the content (content-sync effect only
        // fires on type changes, not content changes, to avoid cursor jump on typing)
        if (p.content !== undefined) el.textContent = p.content

        el.focus()
        try {
            const range = document.createRange()
            const sel = window.getSelection()
            const node = el.firstChild
            if (node && node.nodeType === Node.TEXT_NODE) {
                const pos = Math.min(p.pos, node.textContent?.length ?? 0)
                range.setStart(node, pos)
            } else {
                range.setStart(el, 0)
            }
            range.collapse(true)
            sel?.removeAllRanges()
            sel?.addRange(range)
        } catch { }
    }, [focusedBlockId])


    function deleteSelectedBlocks() {
        if (selectedBlockIds.size === 0) return
        const newBlocks = note.blocks.filter(b => !selectedBlockIds.has(b.id))
        if (newBlocks.length === 0) {
            // Don't allow deleting all blocks, keep one empty paragraph
            const emptyBlock = mkBlock('p')
            pushHistory(note.blocks) // Push current state before change
            onChange(note.id, { blocks: [emptyBlock] })
        } else {
            pushHistory(note.blocks) // Push current state before change
            onChange(note.id, { blocks: newBlocks })
        }
        setSelectedBlockIds(new Set())
        setLastSelectedIdx(null)
    }

    function insertPastedLines(afterId: string, lines: string[]) {
        const blocks = noteBlocksRef.current
        const idx = blocks.findIndex(b => b.id === afterId)
        if (idx === -1) return
        const newBlocks = lines.map(line => ({ ...mkBlock('p'), content: line }))
        const updated = [
            ...blocks.slice(0, idx + 1),
            ...newBlocks,
            ...blocks.slice(idx + 1),
        ]
        pushHistory(note.blocks) // Push current state before change
        onChange(note.id, { blocks: updated })
        setFocusedBlockId(newBlocks[newBlocks.length - 1].id)
    }

    function insertBlockAfter(afterId: string, type: BlockType = 'p', content: string = '') {
        const nb = { ...mkBlock(type), content }
        // Use noteBlocksRef (always-fresh) instead of note.blocks so that calls
        // from setTimeout (e.g. after /date inserts a trailing paragraph) see the
        // already-updated blocks rather than the stale closure value.
        const blocks = noteBlocksRef.current
        const idx = blocks.findIndex(b => b.id === afterId)
        const newBlocks = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
        pushHistory(note.blocks) // Push current state before change
        onChange(note.id, { blocks: newBlocks })
        setFocusedBlockId(nb.id)
    }

    function addTag(tag: string) {
        const t = tag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        if (!t || note.tags.includes(t)) return
        onChange(note.id, { tags: [...note.tags, t] })
        setTagInput('')
        setTagSuggestions([])
    }

    function removeTag(tag: string) {
        onChange(note.id, { tags: note.tags.filter(t => t !== tag) })
    }

    function handleTagInputChange(val: string) {
        setTagInput(val)
        if (val.trim()) {
            const q = val.trim().toLowerCase()
            setTagSuggestions(allTags.filter(t => t.includes(q) && !note.tags.includes(t)).slice(0, 6))
        } else {
            setTagSuggestions([])
        }
    }

    function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault()
            addTag(tagInput)
        }
        if (e.key === 'Backspace' && !tagInput && note.tags.length > 0) {
            removeTag(note.tags[note.tags.length - 1])
        }
    }

    // Global keyboard shortcuts - using refs to avoid closure issues
    const selectedIdsRef = useRef(selectedBlockIds)
    const deleteSelectedBlocksRef = useRef(deleteSelectedBlocks)
    // Cross-block text-selection handler ref (updated whenever blocks/onChange changes)
    const crossBlockDeleteRef = useRef<(charToInsert?: string) => boolean>(() => false)

    useEffect(() => {
        selectedIdsRef.current = selectedBlockIds
    }, [selectedBlockIds])

    useEffect(() => {
        deleteSelectedBlocksRef.current = deleteSelectedBlocks
    }, [note.blocks, selectedBlockIds])

    // ── Drag-select refs ────────────────────────────────────────────────────────
    // Always-fresh view of blocks list (needed inside window event handlers)
    const noteBlocksRef = useRef(note.blocks)
    const isDraggingRef = useRef(false)
    const dragAnchorIdxRef = useRef<number | null>(null)

    useEffect(() => { noteBlocksRef.current = note.blocks }, [note.blocks])

    // ── Cross-block text-selection editing ──────────────────────────────────────
    // When the browser selection spans multiple [data-block-id] elements, normal
    // keyboard events can't delete/replace across them because each block is an
    // independent contenteditable. This ref is kept fresh and called from the
    // global keydown handler to merge boundaries and optionally insert a char.
    useEffect(() => {
        crossBlockDeleteRef.current = function handleCrossBlockTextEdit(charToInsert?: string): boolean {
            const sel = window.getSelection()
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false

            const range = sel.getRangeAt(0)

            // Walk up from a node to find the nearest [data-block-id] container
            function getBlockEl(node: Node): HTMLElement | null {
                let n: Node | null = node
                while (n && n !== document.body) {
                    if (n instanceof HTMLElement && n.hasAttribute('data-block-id')) return n
                    n = n.parentNode
                }
                return null
            }

            const startBlockEl = getBlockEl(range.startContainer)
            const endBlockEl = getBlockEl(range.endContainer)

            // Only act on genuine cross-block selections
            if (!startBlockEl || !endBlockEl || startBlockEl === endBlockEl) return false

            const startBlockId = startBlockEl.getAttribute('data-block-id')!
            const endBlockId = endBlockEl.getAttribute('data-block-id')!

            const blocks = noteBlocksRef.current
            const startIdx = blocks.findIndex(b => b.id === startBlockId)
            const endIdx = blocks.findIndex(b => b.id === endBlockId)
            if (startIdx === -1 || endIdx === -1) return false

            // Normalise so fromIdx < toIdx (handle backward selections)
            const forward = startIdx <= endIdx
            const [fromIdx, toIdx] = forward ? [startIdx, endIdx] : [endIdx, startIdx]
            const [fromEl, toEl] = forward ? [startBlockEl, endBlockEl] : [endBlockEl, startBlockEl]
            const [fromSelNode, fromSelOff] = forward
                ? [range.startContainer, range.startOffset]
                : [range.endContainer, range.endOffset]
            const [toSelNode, toSelOff] = forward
                ? [range.endContainer, range.endOffset]
                : [range.startContainer, range.startOffset]

            const fromBlock = blocks[fromIdx]
            const toBlock = blocks[toIdx]

            // Find the actual visible element (contenteditable OR view-mode div) that
            // contains the selection node. When a block is unfocused its contenteditable
            // is display:none and the browser selection lands in the view-mode div instead.
            // Always using querySelector('[contenteditable]') would produce a cross-subtree
            // range that yields a corrupted text offset.
            function findActualContentEl(blockEl: HTMLElement, selNode: Node): HTMLElement {
                const ce = blockEl.querySelector('[contenteditable="true"]') as HTMLElement | null
                if (ce?.contains(selNode)) return ce
                // selNode is in the view-mode div — find the sibling that actually contains it
                const parent = ce?.parentNode ?? blockEl
                for (const child of Array.from(parent.childNodes)) {
                    if (child instanceof HTMLElement && child !== ce && child.contains(selNode)) return child
                }
                return ce ?? blockEl
            }

            // Measure plain-text characters from start of `container` to `selNode/selOff`
            function measureTextOffset(container: HTMLElement, selNode: Node, selOff: number): number {
                try {
                    const r = document.createRange()
                    r.setStart(container, 0)
                    r.setEnd(selNode, selOff)
                    return r.toString().length
                } catch { return 0 }
            }

            // Extract HTML from a raw HTML string up to a plain-text character offset.
            // Uses DOM Range.cloneContents so unclosed tags are handled correctly.
            function htmlBefore(html: string, textOffset: number): string {
                if (!html || textOffset <= 0) return ''
                const el = document.createElement('div')
                el.innerHTML = html
                if (textOffset >= (el.textContent?.length ?? 0)) return html
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
                let rem = textOffset; let node: Text | null = null; let off = 0
                while (walker.nextNode()) {
                    const t = walker.currentNode as Text
                    if (rem <= t.length) { node = t; off = rem; break }
                    rem -= t.length
                }
                if (!node) return html
                try {
                    const r = document.createRange()
                    r.setStart(el, 0); r.setEnd(node, off)
                    const div = document.createElement('div')
                    div.appendChild(r.cloneContents())
                    return div.innerHTML
                } catch { return '' }
            }

            // Extract HTML from a plain-text character offset to end of a raw HTML string.
            function htmlAfter(html: string, textOffset: number): string {
                if (!html) return ''
                const el = document.createElement('div')
                el.innerHTML = html
                const total = el.textContent?.length ?? 0
                if (textOffset <= 0) return html
                if (textOffset >= total) return ''
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
                let rem = textOffset; let node: Text | null = null; let off = 0
                while (walker.nextNode()) {
                    const t = walker.currentNode as Text
                    if (rem <= t.length) { node = t; off = rem; break }
                    rem -= t.length
                }
                if (!node) return ''
                try {
                    const endR = document.createRange()
                    endR.selectNodeContents(el)
                    const r = document.createRange()
                    r.setStart(node, off); r.setEnd(endR.endContainer, endR.endOffset)
                    const div = document.createElement('div')
                    div.appendChild(r.cloneContents())
                    return div.innerHTML
                } catch { return '' }
            }

            const fromContentEl = findActualContentEl(fromEl, fromSelNode)
            const toContentEl = findActualContentEl(toEl, toSelNode)

            const startTextOffset = measureTextOffset(fromContentEl, fromSelNode, fromSelOff)
            const endTextOffset = measureTextOffset(toContentEl, toSelNode, toSelOff)

            // Merge: keep HTML before cursor in start block + optional char + HTML after cursor in end block.
            // htmlBefore/htmlAfter work on raw block.content (not the processed view-mode HTML) so that
            // linkified URLs and mention spans are never double-applied on the next render.
            const before = htmlBefore(fromBlock.content, startTextOffset)
            const after = htmlAfter(toBlock.content, endTextOffset)
            const mergedContent = before + (charToInsert ?? '') + after
            const cursorTextPos = startTextOffset + (charToInsert ? charToInsert.length : 0)

            // Build new blocks array: replace fromBlock with merged, drop everything from fromIdx+1..toIdx
            const newBlocks: Block[] = []
            for (let i = 0; i < blocks.length; i++) {
                if (i === fromIdx) newBlocks.push({ ...fromBlock, content: mergedContent })
                else if (i > fromIdx && i <= toIdx) { /* deleted */ }
                else newBlocks.push(blocks[i])
            }

            // Synchronously patch the from-block's contenteditable DOM (innerHTML preserves
            // rich formatting; the old code used textContent which stripped all HTML tags).
            const fromEditable = fromEl.querySelector('[contenteditable="true"]') as HTMLElement | null
            if (fromEditable) fromEditable.innerHTML = mergedContent

            // Clear the browser selection before updating React state
            sel.removeAllRanges()

            pushHistory(note.blocks) // Push current state before change
            onChange(note.id, { blocks: newBlocks })
            setFocusedBlockId(fromBlock.id)

            // Place cursor at the merge point after React re-renders
            setTimeout(() => {
                const el = document.querySelector(
                    `[data-block-id="${fromBlock.id}"] [contenteditable]`
                ) as HTMLElement | null
                if (!el) return
                el.focus()
                try {
                    // Walk text nodes to find exact cursor position (handles rich HTML)
                    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
                    let rem = cursorTextPos
                    let targetNode: Text | null = null; let targetOff = 0
                    while (walker.nextNode()) {
                        const t = walker.currentNode as Text
                        if (rem <= t.length) { targetNode = t; targetOff = rem; break }
                        rem -= t.length
                    }
                    const r = document.createRange()
                    if (targetNode) {
                        r.setStart(targetNode, targetOff)
                    } else {
                        r.setStart(el, el.childNodes.length)
                    }
                    r.collapse(true)
                    const s = window.getSelection()
                    s?.removeAllRanges()
                    s?.addRange(r)
                } catch { }
            }, 0)

            return true
        }
    }, [note.blocks, onChange, note.id, pushHistory])

    // Called by BlockItem's grip/margin onMouseDown
    function startDragSelect(blockId: string, blockIdx: number) {
        isDraggingRef.current = true
        dragAnchorIdxRef.current = blockIdx
            ; (document.activeElement as HTMLElement)?.blur()
        setFocusedBlockId(null)
        setSelectedBlockIds(new Set([blockId]))
        setLastSelectedIdx(blockIdx)
    }

    // Called by BlockItem's onMouseEnter while a drag is active
    function extendDragSelect(blockIdx: number) {
        if (!isDraggingRef.current || dragAnchorIdxRef.current === null) return
        const anchor = dragAnchorIdxRef.current
        const blocks = noteBlocksRef.current
        const [from, to] = anchor <= blockIdx ? [anchor, blockIdx] : [blockIdx, anchor]
        const ids = new Set<string>()
        for (let i = from; i <= to; i++) ids.add(blocks[i].id)
        setSelectedBlockIds(ids)
        setLastSelectedIdx(blockIdx)
    }

    // Stop drag on mouseup anywhere in the window
    useEffect(() => {
        function onMouseUp() { isDraggingRef.current = false }
        window.addEventListener('mouseup', onMouseUp)
        return () => window.removeEventListener('mouseup', onMouseUp)
    }, [])

    // ── Cross-block text drag-selection ─────────────────────────────────────────
    // Browsers can't drag-select text across separate contenteditable elements —
    // the selection gets trapped in whichever block the drag started in.
    // Fix: on mousedown inside a contenteditable, snapshot the anchor position;
    // on mousemove (button held), if the cursor has moved into a different block
    // extend the selection programmatically via setBaseAndExtent +
    // caretRangeFromPoint so the visual highlight spans all covered blocks.
    useEffect(() => {
        const state = {
            active: false,
            anchorNode: null as Node | null,
            anchorOffset: 0,
            anchorBlockEl: null as Element | null,
        }

        // Cross-browser helper: get the DOM node + offset under a viewport coordinate
        function caretAt(x: number, y: number): { node: Node; offset: number } | null {
            if (document.caretRangeFromPoint) {
                const r = document.caretRangeFromPoint(x, y)
                return r ? { node: r.startContainer, offset: r.startOffset } : null
            }
            // Firefox
            const pos = (document as any).caretPositionFromPoint?.(x, y)
            return pos ? { node: pos.offsetNode, offset: pos.offset } : null
        }

        function onMouseDown(e: MouseEvent) {
            state.active = false
            state.anchorNode = null

            const target = e.target as Element
            // Only activate for clicks that land directly inside a contenteditable
            if (!target.closest('[contenteditable]')) return
            // Ignore grip handles and other block-selection controls
            if (target.closest('[data-drag-handle]')) return

            const blockEl = target.closest('[data-block-id]')
            if (!blockEl) return

            // Snapshot where the drag begins using caretRangeFromPoint
            const caret = caretAt(e.clientX, e.clientY)
            if (!caret) return

            state.active = true
            state.anchorNode = caret.node
            state.anchorOffset = caret.offset
            state.anchorBlockEl = blockEl
        }

        function onMouseMove(e: MouseEvent) {
            if (e.buttons !== 1 || !state.active || !state.anchorNode) return

            const target = e.target as Element
            const targetBlockEl = target.closest('[data-block-id]')

            // Only intervene when the pointer has crossed into a different block
            if (!targetBlockEl || targetBlockEl === state.anchorBlockEl) return

            const caret = caretAt(e.clientX, e.clientY)
            if (!caret) return

            // Only extend into text blocks — skip date/divider that have no editable
            const inEditable = caret.node instanceof Element
                ? caret.node.closest('[contenteditable]')
                : (caret.node as Node).parentElement?.closest('[contenteditable]')
            if (!inEditable) return

            try {
                window.getSelection()?.setBaseAndExtent(
                    state.anchorNode!, state.anchorOffset,
                    caret.node, caret.offset
                )
            } catch { }
        }

        function onMouseUp() {
            state.active = false
        }

        window.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [])

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            const activeEl = document.activeElement as HTMLElement
            const isContentEditable = !!(activeEl?.contentEditable === 'true' || activeEl?.closest('[contenteditable]'))

            // ── Copied Blocks Cmd-C Cmd-V Navigation ────────────────────────────────
            // Cmd-Z Undo
            if (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                e.preventDefault()
                undoRef.current()
                return
            }

            // Cmd-Shift-Z / Ctrl-Shift-Z Redo
            if ((e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) || (e.key.toLowerCase() === 'y' && e.ctrlKey)) {
                e.preventDefault()
                redoRef.current()
                return
            }

            // Cmd-C Copy Selected Blocks
            if (e.key.toLowerCase() === 'c' && (e.metaKey || e.ctrlKey)) {
                if (selectedIdsRef.current.size > 0 && !isContentEditable) {
                    e.preventDefault()
                    const blocksToCopy = noteBlocksRef.current.filter(b => selectedIdsRef.current.has(b.id))
                    const payload = JSON.stringify({ source: 'locus_blocks', blocks: blocksToCopy })
                    navigator.clipboard.writeText(payload)
                    toast({ description: `${blocksToCopy.length} blocks copied.` })
                    return
                }
            }

            // ── Cross-block text-selection: Backspace / Delete ──────────────────────
            // Must run before the block-selection handler so text-editing wins when
            // the user has dragged a native text selection across multiple blocks.
            if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey) {
                if (crossBlockDeleteRef.current()) {
                    e.preventDefault()
                    return
                }
            }

            // ── Cross-block text-selection: printable character replaces selection ──
            // A single printable key (no modifier) while a cross-block selection is
            // active should delete the selection and insert the typed character.
            if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
                if (crossBlockDeleteRef.current(e.key)) {
                    e.preventDefault()
                    return
                }
            }

            // Delete / Backspace when blocks are selected — delete selected blocks
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdsRef.current.size > 0) {
                e.preventDefault()
                deleteSelectedBlocksRef.current()
                return
            }

            // Cmd/Ctrl + Backspace or Delete — delete selected blocks even while editing text
            if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete') && selectedIdsRef.current.size > 0) {
                e.preventDefault()
                deleteSelectedBlocksRef.current()
                return
            }

            // Escape — clear selection and exit editing
            if (e.key === 'Escape' && selectedIdsRef.current.size > 0) {
                e.preventDefault()
                setSelectedBlockIds(new Set())
                setLastSelectedIdx(null)
                if (isContentEditable) (activeEl as HTMLElement).blur()
            }
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [])

    // Clicking outside any block clears the selection
    useEffect(() => {
        function handleMouseDown(e: MouseEvent) {
            if (selectedIdsRef.current.size === 0) return
            const target = e.target as HTMLElement
            // Keep selection when clicking on a block or on selection-control UI (toolbar buttons)
            if (target.closest('[data-block-id]') || target.closest('[data-keep-selection]')) return
            setSelectedBlockIds(new Set())
            setLastSelectedIdx(null)
        }
        document.addEventListener('mousedown', handleMouseDown)
        return () => document.removeEventListener('mousedown', handleMouseDown)
    }, [])

    // Paste handler for blocks
    useEffect(() => {
        function handleGlobalPaste(e: ClipboardEvent) {
            // Allow native pasting inside active inputs or contenteditables,
            // EXCEPT when we intercept a custom Locus blocks payload
            const text = e.clipboardData?.getData('text/plain') || ''
            try {
                const payload = JSON.parse(text)
                if (payload.source === 'locus_blocks' && Array.isArray(payload.blocks)) {
                    e.preventDefault()
                    const incomingBlocks = payload.blocks.map((b: Block) => cloneBlock(b))

                    let insertIdx = note.blocks.findIndex(b => b.id === focusedBlockId)
                    if (insertIdx === -1) {
                        insertIdx = selectedIdsRef.current.size > 0
                            ? note.blocks.findIndex(b => selectedIdsRef.current.has(b.id))
                            : note.blocks.length - 1
                    }

                    const next = [...note.blocks.slice(0, insertIdx + 1), ...incomingBlocks, ...note.blocks.slice(insertIdx + 1)]
                    pushHistory(note.blocks) // Push current state before change
                    onChange(note.id, { blocks: next })
                    setFocusedBlockId(incomingBlocks[incomingBlocks.length - 1].id)
                    toast({ description: `${incomingBlocks.length} blocks pasted.` })
                }
            } catch {
                // Not our payload, let the browser paste normally
            }
        }

        document.addEventListener('paste', handleGlobalPaste)
        return () => document.removeEventListener('paste', handleGlobalPaste)
    }, [note.blocks, focusedBlockId, pushHistory, onChange, note.id])

    function formatDate(ts: number): string {
        const d = new Date(ts)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffDays = Math.floor(diffMs / 86400000)
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return d.toLocaleDateString('en', { weekday: 'long' })
        if (now.getFullYear() === d.getFullYear()) return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
        return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#f1f5f9] dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm text-[#9ca3af] dark:text-zinc-500">
                    {!sidebarOpen && onToggleSidebar && (
                        <button onClick={onToggleSidebar} title="Open sidebar"
                            className="mr-2 w-7 h-7 rounded-lg bg-[#f9fafb] dark:bg-zinc-800 hover:bg-[#f3f4f6] dark:hover:bg-zinc-700 flex items-center justify-center transition-all border border-[#e5e7eb] dark:border-zinc-700">
                            <PanelLeftOpen className="w-4 h-4 text-[#9ca3af] dark:text-zinc-400" />
                        </button>
                    )}
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    {/* "Notes" root — clickable only when there is a navigation history */}
                    {navStack.length > 0 ? (
                        <button
                            onClick={() => onBreadcrumbNav?.(null)}
                            className="hover:text-[#374151] dark:hover:text-zinc-300 transition-colors shrink-0"
                        >
                            Notes
                        </button>
                    ) : (
                        <span className="shrink-0">Notes</span>
                    )}
                    {/* Ancestor pages in traversal order */}
                    {navStack.map(ancestor => (
                        <React.Fragment key={ancestor.id}>
                            <ChevronRight className="w-3 h-3 shrink-0" />
                            <button
                                onClick={() => onBreadcrumbNav?.(ancestor.id)}
                                className="hover:text-[#374151] dark:hover:text-zinc-300 transition-colors truncate max-w-[120px]"
                                title={ancestor.title || 'Untitled'}
                            >
                                {ancestor.title || 'Untitled'}
                            </button>
                        </React.Fragment>
                    ))}
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span className="text-[#374151] dark:text-zinc-300 font-semibold truncate max-w-[200px]">{note.title || 'Untitled'}</span>
                    {selectedBlockIds.size > 0 && (
                        <>
                            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                            <Badge variant="secondary" className="gap-1.5">
                                <span>{selectedBlockIds.size} selected</span>
                            </Badge>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2" data-keep-selection>
                    {selectedBlockIds.size > 0 && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                    setSelectedBlockIds(new Set())
                                    setLastSelectedIdx(null)
                                }}
                            >
                                <X className="w-3.5 h-3.5" />
                                Deselect
                            </Button>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-8 gap-2"
                                            onClick={() => {
                                                setFocusedBlockId(null)
                                                deleteSelectedBlocks()
                                            }}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete {selectedBlockIds.size > 1 ? selectedBlockIds.size + ' blocks' : 'block'}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Press Delete or Cmd+Backspace</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </>
                    )}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => onDelete(note.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete note</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="max-w-2xl mx-auto px-14 py-12 pb-28">
                    {/* Emoji + Title */}
                    <div className="mb-8 space-y-3">
                        <div className="relative inline-block">
                            <button
                                className="w-12 h-12 flex items-center justify-center hover:bg-muted text-muted-foreground rounded-lg p-1 transition-colors leading-none"
                                onClick={() => setShowEmojiPicker(p => !p)}
                                title="Change icon"
                            >
                                <NoteIcon iconName={note.emoji} className="w-8 h-8" />
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-popover border rounded-xl shadow-xl grid grid-cols-8 gap-1 w-max">
                                    {NOTE_ICON_KEYS.map(em => (
                                        <button key={em}
                                            className={cn("w-10 h-10 flex items-center justify-center flex-shrink-0 overflow-hidden rounded hover:bg-accent text-muted-foreground transition-colors", em === note.emoji && 'bg-accent text-foreground')}
                                            onClick={() => { onChange(note.id, { emoji: em }); setShowEmojiPicker(false) }}
                                        >
                                            <NoteIcon iconName={em} className="w-5 h-5" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <textarea
                            ref={titleRef}
                            value={note.title}
                            onChange={e => {
                                onChange(note.id, { title: e.target.value })
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            onFocus={e => {
                                e.target.style.height = 'auto'
                                e.target.style.height = e.target.scrollHeight + 'px'
                            }}
                            placeholder="Untitled"
                            rows={1}
                            className="w-full text-4xl font-bold tracking-tight bg-transparent outline-none placeholder:text-[#d1d5db] dark:placeholder:text-zinc-600 border-none text-[#111827] dark:text-zinc-100 resize-none overflow-hidden leading-tight"
                        />
                        {/* Created / edited dates */}
                        <div className="flex items-center gap-3 text-xs text-[#d1d5db] dark:text-zinc-600 select-none -mt-1">
                            <span>Created {formatDate(note.createdAt)}</span>
                            <span>·</span>
                            <span>Edited {formatDate(note.updatedAt)}</span>
                        </div>
                    </div>

                    {/* Properties */}
                    <NoteProperties
                        properties={note.properties ?? []}
                        people={people.filter(p => !p.noteId || !notes.find(n => n.id === p.noteId)?.trashedAt)}
                        onChange={(props: NoteProperty[]) => onChange(note.id, { properties: props })}
                    />

                    {/* Blocks */}
                    <FormatToolbar />
                    <div className="space-y-0">
                        {note.blocks.map((block, index) => {
                            // For numbered blocks, count how many consecutive numbered blocks
                            // precede this one so the list always starts at 1.
                            let listIndex = 0
                            if (block.type === 'numbered') {
                                for (let i = index - 1; i >= 0; i--) {
                                    if (note.blocks[i].type === 'numbered') listIndex++
                                    else break
                                }
                            }
                            return (
                                <BlockItem
                                    key={block.id}
                                    block={block}
                                    index={index}
                                    listIndex={listIndex}
                                    numBlocks={note.blocks.length}
                                    isFocused={focusedBlockId === block.id}
                                    isSelected={selectedBlockIds.has(block.id)}
                                    onUpdate={handleUpdateBlock}
                                    onInsert={insertBlockAfter}
                                    onDelete={deleteBlock}
                                    onMergePrev={mergePrevBlock}
                                    onDuplicate={(id) => {
                                        const idx = note.blocks.findIndex(b => b.id === id)
                                        if (idx === -1) return
                                        const b = note.blocks[idx]
                                        const newBlock: Block = { ...b, id: crypto.randomUUID() }
                                        const newBlocks = [...note.blocks.slice(0, idx + 1), newBlock, ...note.blocks.slice(idx + 1)]
                                        pushHistory(note.blocks) // Push current state before change
                                        onChange(note.id, { blocks: newBlocks })
                                        setFocusedBlockId(newBlock.id)
                                    }}
                                    onFocus={setFocusedBlockId}
                                    onSelect={selectBlock}
                                    onDragSelectStart={startDragSelect}
                                    onMouseEnterBlock={extendDragSelect}
                                    onPasteLines={insertPastedLines}
                                    people={people}
                                    onCreatePerson={onCreatePerson}
                                    onNavigateTo={onNavigateTo ?? (() => { })}
                                    objectTypes={objectTypes}
                                    deletedObjectTypes={deletedObjectTypes}
                                    onCreateObjectType={onCreateObjectType}
                                    onFocusPrev={focusPrevBlock}
                                    onFocusNext={focusNextBlock}
                                    onReorderDragStart={startReorderDrag}
                                    isBeingDragged={reorderDragId === block.id}
                                    showDropIndicatorAbove={reorderDropIdx === index}
                                    notes={notes.filter(n => n.id !== note.id)}
                                />
                            )
                        })}
                    </div>

                    {/* Drop indicator after last block */}
                    {reorderDropIdx === note.blocks.length && (
                        <div className="h-0.5 bg-primary rounded-full mx-7 mt-0.5 pointer-events-none" />
                    )}

                    {/* Add block button */}
                    <button
                        className="mt-4 ml-7 flex items-center gap-2 text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors group"
                        onClick={() => {
                            const nb = mkBlock('p')
                            pushHistory(note.blocks)
                            onChange(note.id, { blocks: [...note.blocks, nb] })
                            setFocusedBlockId(nb.id)
                        }}
                    >
                        <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
                        <span>Add block</span>
                    </button>

                    {/* Tags section */}
                    <div className="mt-10 pt-6 border-t">
                        <div className="flex items-center gap-2 mb-3">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {note.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1 pl-2 text-xs font-normal">
                                    <span style={{ color: note.color }} className="opacity-80">#</span>
                                    {tag}
                                    <button className="ml-1 hover:text-destructive transition-colors rounded-sm" onClick={() => removeTag(tag)}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                            <div className="relative">
                                <input
                                    value={tagInput}
                                    onChange={e => handleTagInputChange(e.target.value)}
                                    onKeyDown={handleTagInputKeyDown}
                                    placeholder="Add tag…"
                                    className="h-6 px-2 text-xs bg-muted/50 rounded border border-transparent focus:border-input outline-none placeholder:text-muted-foreground/40 w-28 focus:w-40 transition-all"
                                />
                                {tagSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden min-w-[140px]">
                                        {tagSuggestions.map(t => (
                                            <button key={t}
                                                className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-1.5"
                                                onMouseDown={e => { e.preventDefault(); addTag(t) }}
                                            >
                                                <Hash className="w-3 h-3 text-muted-foreground" />{t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground/60">
                            Press Enter or comma to add · Notes sharing tags connect in the graph
                        </p>
                    </div>

                    {/* Meta */}
                    <div className="mt-6 flex gap-4 text-[10px] text-muted-foreground/60">
                        <span>Created {new Date(note.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </ScrollArea>

            {/* ── Terminal IDE Status Bar ─────────────────────────────────────── */}
            {isTerminal && (() => {
                const focusedBlockIdx = note.blocks.findIndex(b => b.id === focusedBlockId)
                const filename = (note.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md'
                const isInsert = !!focusedBlockId
                return (
                    <div className="terminal-status-bar flex items-stretch h-[22px] text-[10px] font-mono flex-shrink-0 overflow-hidden select-none">
                        {/* Mode pill */}
                        <div className={isInsert ? 'mode-insert' : 'mode-normal'}
                            style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontWeight: 700, letterSpacing: '0.14em', fontSize: 9, flexShrink: 0 }}>
                            {isInsert ? 'INSERT' : 'NORMAL'}
                        </div>
                        {/* Separator */}
                        <div style={{ width: 1, background: 'rgba(78,205,196,0.12)', flexShrink: 0 }} />
                        {/* File name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', color: '#4a6b5e', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ color: '#4ecdc4', opacity: 0.5, flexShrink: 0 }}>✦</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</span>
                        </div>
                        {/* Right stats */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', color: '#2e4a3e', flexShrink: 0, fontSize: 9 }}>
                            <span>{wordCount}<span style={{ color: '#4ecdc4', opacity: 0.4, marginLeft: 2 }}>w</span></span>
                            <span style={{ color: '#1a2e24' }}>│</span>
                            <span>Ln <span style={{ color: '#4a6b5e' }}>{Math.max(1, focusedBlockIdx + 1)}</span></span>
                            <span style={{ color: '#1a2e24' }}>│</span>
                            <span style={{ color: '#4ecdc4', opacity: 0.35, letterSpacing: '0.1em' }}>:w  :q</span>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
