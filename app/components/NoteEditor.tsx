"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Plus, Hash, Trash2, X, ChevronRight, BookOpen,
} from "lucide-react"
import type { Block, BlockType, Note, Person, ObjectType } from "../types"
import { NOTE_EMOJIS } from "../constants"
import { mkBlock } from "../lib/storage"
import { formatDate } from "../lib/helpers"
import { BlockItem } from "./BlockItem"

export function NoteEditor({ note, allTags, onChange, onDelete, people, onCreatePerson, onNavigateTo, objectTypes, onCreateObjectType }: {
  note: Note; allTags: string[]; onChange: (patch: Partial<Note>) => void; onDelete: () => void
  people: Person[]; onCreatePerson: (name: string, typeId?: string) => Person
  onNavigateTo: (noteId: string) => void
  objectTypes: ObjectType[]
  onCreateObjectType: (name: string, emoji: string) => ObjectType
}) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Auto-focus first block when a fresh (single empty block) note is opened
  useEffect(() => {
    if (note.blocks.length === 1 && !note.blocks[0].content) {
      setFocusedBlockId(note.blocks[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateBlock(id: string, patch: Partial<Block>) {
    onChange({
      blocks: note.blocks.map(b => b.id === id ? { ...b, ...patch } : b),
    })
  }

  function selectBlock(blockId: string, evt: React.MouseEvent) {
    const idx = note.blocks.findIndex(b => b.id === blockId)
    if (idx === -1) return

    if (evt.shiftKey && lastSelectedIdx !== null) {
      const [start, end] = idx < lastSelectedIdx ? [idx, lastSelectedIdx] : [lastSelectedIdx, idx]
      const ids = new Set<string>()
      for (let i = start; i <= end; i++) {
        ids.add(note.blocks[i].id)
      }
      setSelectedBlockIds(ids)
      setLastSelectedIdx(idx)
    } else if (evt.metaKey || evt.ctrlKey) {
      const newSelection = new Set(selectedBlockIds)
      if (newSelection.has(blockId)) {
        newSelection.delete(blockId)
      } else {
        newSelection.add(blockId)
      }
      setSelectedBlockIds(newSelection)
      setLastSelectedIdx(idx)
    } else {
      setSelectedBlockIds(new Set([blockId]))
      setLastSelectedIdx(idx)
    }
  }

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
    ;(document.activeElement as HTMLElement)?.blur()
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
          onChange({ blocks: newBlocks })
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
  }, [onChange])

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
    onChange({ blocks: note.blocks.filter(b => b.id !== id) })
    if (prev) {
      pendingCursorRef.current = { id: prev.id, pos: prev.content.length }
      setFocusedBlockId(prev.id)
    }
    selectedBlockIds.delete(id)
    setSelectedBlockIds(new Set(selectedBlockIds))
  }

  function mergePrevBlock(blockId: string, content: string) {
    const idx = note.blocks.findIndex(b => b.id === blockId)
    if (idx <= 0) return
    const prev = note.blocks[idx - 1]
    if (prev.type === 'date' || prev.type === 'divider' || prev.type === 'toggle') return
    const mergedContent = prev.content + content
    const newBlocks = note.blocks
      .filter(b => b.id !== blockId)
      .map(b => b.id === prev.id ? { ...b, content: mergedContent } : b)
    onChange({ blocks: newBlocks })
    pendingCursorRef.current = { id: prev.id, pos: prev.content.length, content: mergedContent }
    setFocusedBlockId(prev.id)
  }

  useEffect(() => {
    const p = pendingCursorRef.current
    if (!p || p.id !== focusedBlockId) return
    pendingCursorRef.current = null

    const el = document.querySelector(
      `[data-block-id="${p.id}"] [contenteditable]`
    ) as HTMLElement | null
    if (!el) return

    if (p.content !== undefined) el.textContent = p.content

    el.focus()
    try {
      const range = document.createRange()
      const sel   = window.getSelection()
      const node  = el.firstChild
      if (node && node.nodeType === Node.TEXT_NODE) {
        const pos = Math.min(p.pos, node.textContent?.length ?? 0)
        range.setStart(node, pos)
      } else {
        range.setStart(el, 0)
      }
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {}
  }, [focusedBlockId])

  function deleteSelectedBlocks() {
    if (selectedBlockIds.size === 0) return
    const newBlocks = note.blocks.filter(b => !selectedBlockIds.has(b.id))
    if (newBlocks.length === 0) {
      onChange({ blocks: [mkBlock('p')] })
    } else {
      onChange({ blocks: newBlocks })
    }
    setSelectedBlockIds(new Set())
    setLastSelectedIdx(null)
  }

  function insertPastedLines(afterId: string, lines: string[]) {
    const idx = note.blocks.findIndex(b => b.id === afterId)
    if (idx === -1) return
    const newBlocks = lines.map(line => ({ ...mkBlock('p'), content: line }))
    const updated = [
      ...note.blocks.slice(0, idx + 1),
      ...newBlocks,
      ...note.blocks.slice(idx + 1),
    ]
    onChange({ blocks: updated })
    setFocusedBlockId(newBlocks[newBlocks.length - 1].id)
  }

  function insertBlockAfter(afterId: string, type: BlockType = 'p', content: string = '') {
    const nb = { ...mkBlock(type), content }
    const blocks = noteBlocksRef.current
    const idx = blocks.findIndex(b => b.id === afterId)
    const newBlocks = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]
    onChange({ blocks: newBlocks })
    setFocusedBlockId(nb.id)
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!t || note.tags.includes(t)) return
    onChange({ tags: [...note.tags, t] })
    setTagInput('')
    setTagSuggestions([])
  }

  function removeTag(tag: string) {
    onChange({ tags: note.tags.filter(t => t !== tag) })
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

  const selectedIdsRef = useRef(selectedBlockIds)
  const deleteSelectedBlocksRef = useRef(deleteSelectedBlocks)
  const crossBlockDeleteRef = useRef<(charToInsert?: string) => boolean>(() => false)

  useEffect(() => {
    selectedIdsRef.current = selectedBlockIds
  }, [selectedBlockIds])

  useEffect(() => {
    deleteSelectedBlocksRef.current = deleteSelectedBlocks
  }, [note.blocks, selectedBlockIds])

  // ── Drag-select refs ────────────────────────────────────────────────────────
  const noteBlocksRef     = useRef(note.blocks)
  const isDraggingRef     = useRef(false)
  const dragAnchorIdxRef  = useRef<number | null>(null)

  useEffect(() => { noteBlocksRef.current = note.blocks }, [note.blocks])

  // ── Cross-block text-selection editing ──────────────────────────────────────
  useEffect(() => {
    crossBlockDeleteRef.current = function handleCrossBlockTextEdit(charToInsert?: string): boolean {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false

      const range = sel.getRangeAt(0)

      function getBlockEl(node: Node): HTMLElement | null {
        let n: Node | null = node
        while (n && n !== document.body) {
          if (n instanceof HTMLElement && n.hasAttribute('data-block-id')) return n
          n = n.parentNode
        }
        return null
      }

      const startBlockEl = getBlockEl(range.startContainer)
      const endBlockEl   = getBlockEl(range.endContainer)

      if (!startBlockEl || !endBlockEl || startBlockEl === endBlockEl) return false

      const startBlockId = startBlockEl.getAttribute('data-block-id')!
      const endBlockId   = endBlockEl.getAttribute('data-block-id')!

      const blocks  = noteBlocksRef.current
      const startIdx = blocks.findIndex(b => b.id === startBlockId)
      const endIdx   = blocks.findIndex(b => b.id === endBlockId)
      if (startIdx === -1 || endIdx === -1) return false

      const forward = startIdx <= endIdx
      const [fromIdx, toIdx]         = forward ? [startIdx, endIdx]             : [endIdx, startIdx]
      const [fromEl,  toEl]          = forward ? [startBlockEl, endBlockEl]     : [endBlockEl, startBlockEl]
      const [fromNode, fromOff]      = forward
        ? [range.startContainer, range.startOffset]
        : [range.endContainer,   range.endOffset]
      const [toNode,  toOff]         = forward
        ? [range.endContainer,   range.endOffset]
        : [range.startContainer, range.startOffset]

      function getEditable(el: HTMLElement): HTMLElement {
        return (el.querySelector('[contenteditable]') as HTMLElement) ?? el
      }

      const fromEditable = getEditable(fromEl)
      const toEditable   = getEditable(toEl)

      let startTextOffset = 0
      let endTextOffset   = (toEditable.textContent || '').length

      try {
        const r = document.createRange()
        r.setStart(fromEditable, 0)
        r.setEnd(fromNode, fromOff)
        startTextOffset = r.toString().length
      } catch { startTextOffset = 0 }

      try {
        const r = document.createRange()
        r.setStart(toEditable, 0)
        r.setEnd(toNode, toOff)
        endTextOffset = r.toString().length
      } catch { endTextOffset = (toEditable.textContent || '').length }

      const fromBlock = blocks[fromIdx]
      const toBlock   = blocks[toIdx]

      const mergedContent = fromBlock.content.slice(0, startTextOffset)
                          + (charToInsert ?? '')
                          + toBlock.content.slice(endTextOffset)
      const cursorPos = startTextOffset + (charToInsert ? charToInsert.length : 0)

      const newBlocks: Block[] = []
      for (let i = 0; i < blocks.length; i++) {
        if (i === fromIdx)                     newBlocks.push({ ...fromBlock, content: mergedContent })
        else if (i > fromIdx && i <= toIdx)    { /* deleted */ }
        else                                   newBlocks.push(blocks[i])
      }

      if (fromEditable) fromEditable.textContent = mergedContent

      sel.removeAllRanges()

      onChange({ blocks: newBlocks })
      setFocusedBlockId(fromBlock.id)

      setTimeout(() => {
        const el = document.querySelector(
          `[data-block-id="${fromBlock.id}"] [contenteditable]`
        ) as HTMLElement | null
        if (!el) return
        el.focus()
        try {
          const textNode = el.firstChild
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const r   = document.createRange()
            const pos = Math.min(cursorPos, textNode.textContent?.length ?? 0)
            r.setStart(textNode, pos)
            r.collapse(true)
            const s = window.getSelection()
            s?.removeAllRanges()
            s?.addRange(r)
          } else {
            const r = document.createRange()
            r.setStart(el, 0)
            r.collapse(true)
            const s = window.getSelection()
            s?.removeAllRanges()
            s?.addRange(r)
          }
        } catch {}
      }, 0)

      return true
    }
  }, [note.blocks, onChange])

  function startDragSelect(blockId: string, blockIdx: number) {
    isDraggingRef.current    = true
    dragAnchorIdxRef.current = blockIdx
    ;(document.activeElement as HTMLElement)?.blur()
    setFocusedBlockId(null)
    setSelectedBlockIds(new Set([blockId]))
    setLastSelectedIdx(blockIdx)
  }

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

  useEffect(() => {
    function onMouseUp() { isDraggingRef.current = false }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [])

  // ── Cross-block text drag-selection ─────────────────────────────────────────
  useEffect(() => {
    const state = {
      active: false,
      anchorNode: null as Node | null,
      anchorOffset: 0,
      anchorBlockEl: null as Element | null,
    }

    function caretAt(x: number, y: number): { node: Node; offset: number } | null {
      if (document.caretRangeFromPoint) {
        const r = document.caretRangeFromPoint(x, y)
        return r ? { node: r.startContainer, offset: r.startOffset } : null
      }
      const pos = (document as any).caretPositionFromPoint?.(x, y)
      return pos ? { node: pos.offsetNode, offset: pos.offset } : null
    }

    function onMouseDown(e: MouseEvent) {
      state.active = false
      state.anchorNode = null

      const target = e.target as Element
      if (!target.closest('[contenteditable]')) return
      if (target.closest('[data-drag-handle]')) return

      const blockEl = target.closest('[data-block-id]')
      if (!blockEl) return

      const caret = caretAt(e.clientX, e.clientY)
      if (!caret) return

      state.active       = true
      state.anchorNode   = caret.node
      state.anchorOffset = caret.offset
      state.anchorBlockEl = blockEl
    }

    function onMouseMove(e: MouseEvent) {
      if (e.buttons !== 1 || !state.active || !state.anchorNode) return

      const target = e.target as Element
      const targetBlockEl = target.closest('[data-block-id]')

      if (!targetBlockEl || targetBlockEl === state.anchorBlockEl) return

      const caret = caretAt(e.clientX, e.clientY)
      if (!caret) return

      const inEditable = caret.node instanceof Element
        ? caret.node.closest('[contenteditable]')
        : (caret.node as Node).parentElement?.closest('[contenteditable]')
      if (!inEditable) return

      try {
        window.getSelection()?.setBaseAndExtent(
          state.anchorNode!, state.anchorOffset,
          caret.node, caret.offset
        )
      } catch {}
    }

    function onMouseUp() {
      state.active = false
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement as HTMLElement
      const isContentEditable = !!(activeEl?.contentEditable === 'true' || activeEl?.closest('[contenteditable]'))

      if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey) {
        if (crossBlockDeleteRef.current()) {
          e.preventDefault()
          return
        }
      }

      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (crossBlockDeleteRef.current(e.key)) {
          e.preventDefault()
          return
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdsRef.current.size > 0) {
        e.preventDefault()
        deleteSelectedBlocksRef.current()
        return
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'Backspace' || e.key === 'Delete') && selectedIdsRef.current.size > 0) {
        e.preventDefault()
        deleteSelectedBlocksRef.current()
        return
      }

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

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (selectedIdsRef.current.size === 0) return
      const target = e.target as HTMLElement
      if (target.closest('[data-block-id]') || target.closest('[data-keep-selection]')) return
      setSelectedBlockIds(new Set())
      setLastSelectedIdx(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Notes</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{note.title || 'Untitled'}</span>
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
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete note</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-8 py-10 pb-24">
          {/* Emoji + Title */}
          <div className="mb-8 space-y-3">
            <div className="relative inline-block">
              <button
                className="text-5xl hover:bg-muted rounded-lg p-1 transition-colors leading-none"
                onClick={() => setShowEmojiPicker(p => !p)}
                title="Change emoji"
              >
                {note.emoji}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-popover border rounded-xl shadow-xl grid grid-cols-8 gap-1 w-max">
                  {NOTE_EMOJIS.map(em => (
                    <button key={em}
                      className={cn("w-10 h-10 flex items-center justify-center flex-shrink-0 overflow-hidden rounded hover:bg-accent transition-colors", em === note.emoji && 'bg-accent')}
                      style={{ fontSize: '22px', lineHeight: 1 }}
                      onClick={() => { onChange({ emoji: em }); setShowEmojiPicker(false) }}
                    >{em}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              ref={titleRef}
              value={note.title}
              onChange={e => onChange({ title: e.target.value })}
              placeholder="Untitled"
              className="w-full text-4xl font-bold tracking-tight bg-transparent outline-none placeholder:text-muted-foreground/40 border-none"
            />
            {/* Created / edited dates */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground/55 select-none -mt-1">
              <span>Created {formatDate(note.createdAt)}</span>
              <span>·</span>
              <span>Edited {formatDate(note.updatedAt)}</span>
            </div>
          </div>

          {/* Blocks */}
          <div className="space-y-0">
            {note.blocks.map((block, index) => {
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
                  onUpdate={updateBlock}
                  onInsert={insertBlockAfter}
                  onDelete={deleteBlock}
                  onMergePrev={mergePrevBlock}
                  onFocus={setFocusedBlockId}
                  onSelect={selectBlock}
                  onDragSelectStart={startDragSelect}
                  onMouseEnterBlock={extendDragSelect}
                  onPasteLines={insertPastedLines}
                  people={people}
                  onCreatePerson={onCreatePerson}
                  onNavigateTo={onNavigateTo}
                  objectTypes={objectTypes}
                  onCreateObjectType={onCreateObjectType}
                  onFocusPrev={focusPrevBlock}
                  onFocusNext={focusNextBlock}
                  onReorderDragStart={startReorderDrag}
                  isBeingDragged={reorderDragId === block.id}
                  showDropIndicatorAbove={reorderDropIdx === index}
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
              onChange({ blocks: [...note.blocks, nb] })
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
    </div>
  )
}
