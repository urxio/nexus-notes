"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Trash2, ChevronRight, GripVertical, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Block, BlockType, ObjectType, Person } from "../types"
import { BLOCK_ICONS, BLOCK_PLACEHOLDERS, SLASH_MENU_ITEMS } from "../constants"
import { BUILTIN_OBJECT_TYPES } from "../lib/storage"
import { renderMentions } from "../lib/mentions"
import { DateBlock } from "./DateBlock"

export interface BlockItemProps {
  block: Block; index: number; listIndex: number; numBlocks: number; isFocused: boolean
  isSelected: boolean
  onUpdate: (id: string, patch: Partial<Block>) => void
  onInsert: (afterId: string, type?: BlockType, content?: string) => void
  onDelete: (id: string) => void
  onMergePrev: (id: string, content: string) => void
  onDuplicate?: (id: string) => void
  onFocus: (id: string) => void
  onSelect: (id: string, evt: React.MouseEvent) => void
  onDragSelectStart: (id: string, idx: number) => void
  onMouseEnterBlock: (idx: number) => void
  onPasteLines: (afterId: string, lines: string[]) => void
  people: Person[]
  onCreatePerson: (name: string, typeId?: string) => Person
  onFocusPrev: (id: string) => void
  onFocusNext: (id: string) => void
  onReorderDragStart: (id: string) => void
  isBeingDragged: boolean
  showDropIndicatorAbove: boolean
  onNavigateTo: (noteId: string) => void
  objectTypes: ObjectType[]
  onCreateObjectType: (name: string, emoji: string) => ObjectType
}

export function BlockItem({
  block, index, listIndex, numBlocks, isFocused, isSelected,
  onUpdate, onInsert, onDelete, onMergePrev, onDuplicate,
  onFocus, onSelect, onDragSelectStart, onMouseEnterBlock, onPasteLines,
  people, onCreatePerson, onFocusPrev, onFocusNext,
  onReorderDragStart, isBeingDragged, showDropIndicatorAbove,
  onNavigateTo, objectTypes, onCreateObjectType,
}: BlockItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [menuFilter, setMenuFilter] = useState('')
  const [menuIdx, setMenuIdx] = useState(0)
  const prevContentRef = useRef(block.content)
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIdx, setMentionIdx] = useState(0)
  const mentionAnchorRef = useRef<number>(-1)
  const [showNewTypeForm, setShowNewTypeForm] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeEmoji, setNewTypeEmoji] = useState('🔖')

  // Set content imperatively on mount / type change (avoid cursor jump)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el) el.textContent = block.content
  }, [block.type])

  // Focus imperatively (cursor at start). Also re-fires on type change so
  // slash-command type switches restore focus to the new contenteditable.
  useEffect(() => {
    if (!isFocused || !ref.current) return
    if (document.activeElement !== ref.current) ref.current.focus()
    try {
      const range = document.createRange()
      const sel = window.getSelection()
      if (ref.current.firstChild) range.setStart(ref.current.firstChild, 0)
      else range.setStart(ref.current, 0)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {}
  }, [isFocused, block.type])

  const filteredMenu = SLASH_MENU_ITEMS.filter(item =>
    item.label.toLowerCase().includes(menuFilter.toLowerCase()) ||
    item.type.includes(menuFilter.toLowerCase())
  )

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const text = e.currentTarget.textContent || ''
    prevContentRef.current = text

    const shortcuts: [string | RegExp, BlockType][] = [
      ['# ', 'h1'], ['## ', 'h2'], ['### ', 'h3'],
      ['- ', 'bullet'], ['* ', 'bullet'],
      [/^1\. $/, 'numbered'],
      ['>> ', 'toggle'], ['> ', 'quote'],
      ['```', 'code'], ['---', 'divider'], ['[]', 'todo'], ['[ ]', 'todo'],
    ]
    for (const [pat, newType] of shortcuts) {
      const match = typeof pat === 'string' ? text === pat : pat.test(text)
      if (match) {
        if (ref.current) ref.current.textContent = ''
        const content = newType === 'date' ? new Date().toISOString().split('T')[0] : ''
        onUpdate(block.id, { type: newType, content })
        if (newType === 'date' || newType === 'divider') setTimeout(() => onInsert(block.id, 'p', ''), 0)
        return
      }
    }

    if (text.startsWith('/')) {
      setMenuFilter(text.slice(1)); setMenuIdx(0); setShowMenu(true)
    } else {
      setShowMenu(false)
    }

    try {
      const cursorEl = e.currentTarget
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(cursorEl, 0)
        pre.setEnd(range.startContainer, range.startOffset)
        const textBeforeCursor = pre.toString()
        const atMatch = textBeforeCursor.match(/@([^@\s]*)$/)
        if (atMatch) {
          setMentionFilter(atMatch[1]); setMentionIdx(0); setShowMentionMenu(true)
          mentionAnchorRef.current = textBeforeCursor.length - atMatch[0].length
        } else {
          setShowMentionMenu(false); mentionAnchorRef.current = -1
        }
      } else {
        setShowMentionMenu(false); mentionAnchorRef.current = -1
      }
    } catch { setShowMentionMenu(false) }

    onUpdate(block.id, { content: text })
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const plain = e.clipboardData.getData('text/plain')
    if (!plain) return
    const el = e.currentTarget
    const sel = window.getSelection()
    let cursorStart = (el.textContent || '').length
    let cursorEnd = cursorStart
    if (sel && sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(el, 0); pre.setEnd(range.startContainer, range.startOffset)
        cursorStart = pre.toString().length
        cursorEnd = range.collapsed ? cursorStart : (() => {
          const post = document.createRange()
          post.setStart(el, 0); post.setEnd(range.endContainer, range.endOffset)
          return post.toString().length
        })()
      } catch {}
    }
    const existing = el.textContent || ''
    const before = existing.slice(0, cursorStart)
    const after = existing.slice(cursorEnd)
    const lines = plain.split(/\r?\n/)
    const firstLine = before + lines[0]
    if (lines.length === 1) {
      const newContent = firstLine + after
      el.textContent = newContent
      try {
        const textNode = el.firstChild
        if (textNode) {
          const range = document.createRange()
          const pos = Math.min(firstLine.length, textNode.textContent?.length ?? 0)
          range.setStart(textNode, pos); range.collapse(true)
          sel?.removeAllRanges(); sel?.addRange(range)
        }
      } catch {}
      onUpdate(block.id, { content: newContent })
    } else {
      const lastLine = lines[lines.length - 1] + after
      el.textContent = firstLine
      onUpdate(block.id, { content: firstLine })
      onPasteLines(block.id, [...lines.slice(1, -1), lastLine])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const text = e.currentTarget.textContent || ''

    if (showMenu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIdx(i => Math.min(i + 1, filteredMenu.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenuIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' && filteredMenu[menuIdx]) { e.preventDefault(); applyMenuItem(filteredMenu[menuIdx].type); return }
      if (e.key === 'Escape') { setShowMenu(false); return }
    }

    if (showMentionMenu) {
      const filteredPeople = people.filter(p => p.name.toLowerCase().includes(mentionFilter.toLowerCase()))
      const totalItems = filteredPeople.length + (mentionFilter.trim().length > 0 && !filteredPeople.some(p => p.name.toLowerCase() === mentionFilter.toLowerCase()) ? 1 : 0)
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, totalItems - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredPeople[mentionIdx]) insertMention(filteredPeople[mentionIdx].name)
        else if (mentionIdx === filteredPeople.length && mentionFilter.trim()) {
          const person = onCreatePerson(mentionFilter.trim()); insertMention(person.name)
        }
        return
      }
      if (e.key === 'Escape') { setShowMentionMenu(false); return }
    }

    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && ref.current) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        const cursorRects = range.getClientRects()
        const elRect = ref.current.getBoundingClientRect()
        const lh = parseFloat(getComputedStyle(ref.current).lineHeight) || 24
        if (e.key === 'ArrowUp') {
          const top = cursorRects.length > 0 ? cursorRects[0].top : elRect.top
          if (top <= elRect.top + lh * 0.6) { e.preventDefault(); onFocusPrev(block.id); return }
        } else {
          const last = cursorRects[cursorRects.length - 1]
          const bottom = last ? last.bottom : elRect.bottom
          if (bottom >= elRect.bottom - lh * 0.6) { e.preventDefault(); onFocusNext(block.id); return }
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if ((block.type === 'bullet' || block.type === 'numbered') && !text) {
        onUpdate(block.id, { type: 'p', content: '' }); return
      }
      const el = e.currentTarget
      let cursorPos = text.length
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        try {
          const range = sel.getRangeAt(0)
          const pre = document.createRange()
          pre.setStart(el, 0); pre.setEnd(range.startContainer, range.startOffset)
          cursorPos = pre.toString().length
        } catch {}
      }
      const before = text.slice(0, cursorPos), after = text.slice(cursorPos)
      el.textContent = before
      onUpdate(block.id, { content: before })
      const nextType: BlockType = block.type === 'bullet' ? 'bullet' : block.type === 'numbered' ? 'numbered' : 'p'
      onInsert(block.id, nextType, after)
      return
    }

    if (e.key === 'Backspace') {
      if (!text) {
        e.preventDefault()
        if (numBlocks > 1) onDelete(block.id)
        else if (block.type !== 'p') onUpdate(block.id, { type: 'p', content: '' })
        return
      }
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
        let cursorAtStart = false
        try {
          const range = sel.getRangeAt(0)
          const pre = document.createRange()
          pre.setStart(e.currentTarget, 0); pre.setEnd(range.startContainer, range.startOffset)
          cursorAtStart = pre.toString().length === 0
        } catch {}
        if (cursorAtStart) { e.preventDefault(); onMergePrev(block.id, text); return }
      }
    }

    if (e.key === 'Tab') e.preventDefault()
  }

  function insertMention(personName: string) {
    const el = ref.current
    if (!el || mentionAnchorRef.current === -1) return
    const currentText = el.textContent || ''
    const anchorPos = mentionAnchorRef.current
    let cursorPos = currentText.length
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0)
        const pre = document.createRange()
        pre.setStart(el, 0); pre.setEnd(range.startContainer, range.startOffset)
        cursorPos = pre.toString().length
      } catch {}
    }
    const mentionText = `@${personName}`
    const newText = currentText.slice(0, anchorPos) + mentionText + ' ' + currentText.slice(cursorPos)
    el.textContent = newText
    const newCursorPos = anchorPos + mentionText.length + 1
    try {
      const textNode = el.firstChild
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange()
        range.setStart(textNode, Math.min(newCursorPos, (textNode as Text).length))
        range.collapse(true); sel?.removeAllRanges(); sel?.addRange(range)
      }
    } catch {}
    onUpdate(block.id, { content: newText })
    setShowMentionMenu(false); setMentionFilter(''); mentionAnchorRef.current = -1
  }

  const bodyCallbackRef = useCallback((el: HTMLDivElement | null) => {
    ;(bodyRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (el) el.textContent = block.expandedContent ?? ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.open, block.type])

  function handleBodyInput(e: React.FormEvent<HTMLDivElement>) {
    onUpdate(block.id, { expandedContent: e.currentTarget.textContent || '' })
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onInsert(block.id, 'p', ''); return }
    if (e.key === 'Backspace' && !e.currentTarget.textContent) {
      e.preventDefault()
      onUpdate(block.id, { open: false })
      setTimeout(() => {
        if (!ref.current) return
        ref.current.focus()
        try {
          const range = document.createRange()
          const sel = window.getSelection()
          const node = ref.current.firstChild
          if (node && node.nodeType === Node.TEXT_NODE) range.setStart(node, (node as Text).length)
          else range.setStart(ref.current, 0)
          range.collapse(true); sel?.removeAllRanges(); sel?.addRange(range)
        } catch {}
      }, 0)
    }
  }

  function applyMenuItem(type: BlockType) {
    if (ref.current) ref.current.textContent = ''
    const content = type === 'date' ? new Date().toISOString().split('T')[0]
      : type === 'table' ? '   |   |   \n   |   |   \n   |   |   ' : ''
    onUpdate(block.id, { type, content })
    setShowMenu(false); setMenuFilter('')
    if (type === 'date' || type === 'divider') setTimeout(() => onInsert(block.id, 'p', ''), 0)
  }

  function handleContainerClick(e: React.MouseEvent) {
    if (block.type === 'divider' || block.type === 'date') { e.preventDefault(); onSelect(block.id, e) }
  }

  function handleGripMouseDown(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const activeEl = document.activeElement as HTMLElement
    if (activeEl?.contentEditable === 'true') activeEl.blur()
    if (e.shiftKey || e.metaKey || e.ctrlKey) onSelect(block.id, e)
    else onDragSelectStart(block.id, index)
  }

  const gripEl = (
    <div
      data-drag-handle onMouseDown={handleGripMouseDown}
      className={cn(
        "w-6 h-6 rounded cursor-grab active:cursor-grabbing flex items-center justify-center transition-opacity text-muted-foreground/40 hover:text-muted-foreground/70 flex-shrink-0",
        isSelected ? "opacity-60" : "opacity-0 group-hover:opacity-100"
      )}
      title="Drag to select · Shift+click range · Cmd+click toggle"
    >
      <GripVertical className="w-4 h-4" />
    </div>
  )

  // ── Divider ──────────────────────────────────────────────────────────────────
  if (block.type === 'divider') {
    return (
      <div ref={containerRef} data-block-id={block.id}
        className={cn("relative group -mx-7 px-7 py-2 transition-all rounded-sm cursor-pointer", isSelected && "bg-primary/10 ring-1 ring-primary/20")}
        onClick={handleContainerClick} onMouseEnter={() => onMouseEnterBlock(index)}
      >
        <div className="flex items-center gap-2">
          {gripEl}
          <hr className="border-border flex-1" />
          <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(block.id) }} title="Delete block">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  // ── Date ─────────────────────────────────────────────────────────────────────
  if (block.type === 'date') {
    return (
      <div ref={containerRef} data-block-id={block.id}
        className={cn("relative group -mx-7 px-7 py-2 transition-all rounded-sm", isSelected && "bg-primary/10 ring-1 ring-primary/20")}
        onClick={handleContainerClick} onMouseEnter={() => onMouseEnterBlock(index)}
      >
        <div className="flex items-center gap-2">
          {gripEl}
          <DateBlock block={block} onUpdate={onUpdate} />
          <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive ml-auto"
            onClick={(e) => { e.stopPropagation(); onDelete(block.id) }} title="Delete block">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  // ── Shared styles ─────────────────────────────────────────────────────────────
  const baseEditable = cn("outline-none min-h-[1.4em] break-words flex-1")
  const typeClass: Record<BlockType, string> = {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-2xl font-semibold',
    h3: 'text-xl font-semibold',
    p: 'text-base leading-relaxed',
    bullet: 'text-base leading-relaxed',
    numbered: 'text-base leading-relaxed',
    quote: 'text-base leading-relaxed italic border-l-4 border-primary/60 pl-4 text-foreground/70',
    code: 'text-sm font-mono bg-muted/80 dark:bg-muted rounded-md px-3 py-2 text-foreground/90',
    divider: '', todo: 'text-base leading-relaxed', date: '',
    toggle: 'text-base font-medium leading-relaxed',
    table: 'text-sm font-mono bg-muted/60 dark:bg-muted rounded-md px-3 py-2 text-foreground/90',
  }

  // ── Editable element (used by most block types) ───────────────────────────────
  const editableEl = (
    <div className="relative flex-1">
      <div
        ref={ref} contentEditable suppressContentEditableWarning
        className={cn("outline-none min-h-[1.4em] break-words w-full", typeClass[block.type])}
        onKeyDown={handleKeyDown} onInput={handleInput} onPaste={handlePaste}
        onFocus={() => onFocus(block.id)}
        style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', display: isFocused ? undefined : 'none' }}
      />
      {isFocused && !block.content && (
        <div className={cn("absolute inset-0 pointer-events-none select-none text-muted-foreground/50", typeClass[block.type])}
          style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} aria-hidden="true">
          {BLOCK_PLACEHOLDERS[block.type]}
        </div>
      )}
      {!isFocused && (
        <div className={cn("outline-none min-h-[1.4em] break-words w-full cursor-text", typeClass[block.type])}
          style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} onClick={() => onFocus(block.id)}>
          {block.content ? renderMentions(block.content, people, onNavigateTo) : null}
        </div>
      )}
    </div>
  )

  const allTypes = [...BUILTIN_OBJECT_TYPES, ...objectTypes]
  const NEW_TYPE_EMOJIS = ['🔖', '📋', '🏢', '🎯', '💼', '🔧', '🌐', '📅', '🎪', '🔑', '🧩', '⭐']

  return (
    <div ref={containerRef} data-block-id={block.id}
      className={cn("relative group -mx-7 px-7 py-1 transition-all rounded-sm",
        isSelected && "bg-primary/10 ring-1 ring-primary/20", isBeingDragged && "opacity-40")}
      onClick={handleContainerClick} onMouseEnter={() => onMouseEnterBlock(index)}
    >
      {showDropIndicatorAbove && (
        <div className="absolute top-0 left-7 right-7 h-0.5 bg-primary rounded-full z-20 pointer-events-none" />
      )}
      <div className="absolute left-0 top-0 bottom-0 w-7 cursor-pointer" onMouseDown={handleGripMouseDown} />
      <div className="flex items-start gap-2">
        {/* Reorder handle */}
        <div
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onReorderDragStart(block.id) }}
          className={cn("w-6 h-6 rounded cursor-grab active:cursor-grabbing flex items-center justify-center transition-opacity text-muted-foreground/40 hover:text-muted-foreground/70 flex-shrink-0 mt-1",
            isBeingDragged ? "opacity-60" : "opacity-0 group-hover:opacity-100")}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Block content by type */}
        {block.type === 'bullet' ? (
          <div className="flex items-baseline gap-2 flex-1">
            <span className="text-muted-foreground/60 leading-none select-none shrink-0 w-4 text-center">•</span>
            {editableEl}
          </div>
        ) : block.type === 'numbered' ? (
          <div className="flex items-baseline gap-1 flex-1">
            <span className="text-muted-foreground/60 text-sm tabular-nums select-none w-5 text-right shrink-0 leading-normal">{listIndex + 1}.</span>
            {editableEl}
          </div>
        ) : block.type === 'todo' ? (
          <div className="flex items-center gap-2 flex-1">
            <input type="checkbox" checked={block.checked ?? false}
              onChange={() => onUpdate(block.id, { checked: !block.checked })}
              className="rounded cursor-pointer accent-primary flex-shrink-0 w-4 h-4"
            />
            <div className="relative flex-1">
              <div ref={ref} contentEditable suppressContentEditableWarning
                className={cn("outline-none min-h-[1.4em] break-words w-full", 'text-base leading-relaxed', block.checked && 'line-through text-muted-foreground/60')}
                onKeyDown={handleKeyDown} onInput={handleInput} onPaste={handlePaste} onFocus={() => onFocus(block.id)}
                style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', display: isFocused ? undefined : 'none' }}
              />
              {isFocused && !block.content && (
                <div className="absolute inset-0 pointer-events-none select-none text-base leading-relaxed text-muted-foreground/50"
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} aria-hidden="true">To-do</div>
              )}
              {!isFocused && (
                <div className={cn("outline-none min-h-[1.4em] break-words w-full cursor-text", 'text-base leading-relaxed', block.checked && 'line-through text-muted-foreground/60')}
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} onClick={() => onFocus(block.id)}>
                  {block.content ? renderMentions(block.content, people, onNavigateTo) : null}
                </div>
              )}
            </div>
          </div>
        ) : block.type === 'toggle' ? (
          <div className="flex-1">
            <div className="flex items-start gap-1">
              <button className="mt-[3px] flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onUpdate(block.id, { open: !block.open })}
                title={block.open ? 'Collapse' : 'Expand'}
              >
                <ChevronRight className={cn('w-4 h-4 transition-transform duration-150', block.open && 'rotate-90')} />
              </button>
              {editableEl}
            </div>
            {block.open && (
              <div className="ml-5 mt-1 pl-3 border-l-2 border-muted-foreground/20">
                <div ref={bodyCallbackRef} contentEditable suppressContentEditableWarning
                  data-placeholder="Toggle content…"
                  className={cn(baseEditable, 'text-base leading-relaxed text-foreground/75',
                    isFocused && 'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40')}
                  onInput={handleBodyInput} onKeyDown={handleBodyKeyDown} onFocus={() => onFocus(block.id)}
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                />
              </div>
            )}
          </div>
        ) : block.type === 'table' ? (
          <div className="flex-1">
            <div className="inline-block border rounded-md overflow-hidden bg-background/80">
              <table className="border-collapse text-sm">
                <tbody>
                  {block.content.split('\n').map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.split('|').map((cell, colIdx) => (
                        <td key={colIdx} className="border border-border min-w-[80px] px-2 py-1 align-top">
                          <div contentEditable suppressContentEditableWarning
                            className="outline-none whitespace-pre-wrap"
                            onInput={(e) => {
                              const text = e.currentTarget.textContent ?? ''
                              const rows = block.content.split('\n').map(r => r.split('|'))
                              if (!rows[rowIdx]) rows[rowIdx] = []
                              rows[rowIdx][colIdx] = text
                              onUpdate(block.id, { content: rows.map(r => r.map(c => c ?? '').join('|')).join('\n') })
                            }}
                          >{cell}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          editableEl
        )}

        {/* Delete button */}
        <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive flex-shrink-0 mt-1"
          onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
          title="Delete block (or press Backspace when empty)">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slash command menu */}
      {showMenu && filteredMenu.length > 0 && (
        <div className="absolute left-12 top-full z-50 mt-1 w-56 rounded-lg border bg-popover shadow-lg overflow-hidden">
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium tracking-wider border-b">BLOCKS</div>
          <div className="py-1 max-h-52 overflow-y-auto">
            {filteredMenu.map((item, i) => (
              <button key={item.type}
                className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left", i === menuIdx && 'bg-accent')}
                onMouseDown={e => { e.preventDefault(); applyMenuItem(item.type) }}
              >
                <span className="text-muted-foreground">{BLOCK_ICONS[item.type]}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1 rounded">{item.shortcut}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* @ Mention menu */}
      {showMentionMenu && (() => {
        const filteredObjects = people.filter(p => p.name.toLowerCase().includes(mentionFilter.toLowerCase()))
        const trimmedFilter = mentionFilter.trim()
        const exactMatch = filteredObjects.some(p => p.name.toLowerCase() === trimmedFilter.toLowerCase())
        const canCreate = trimmedFilter.length > 0 && !exactMatch
        const createOptions = canCreate ? allTypes : []
        return (
          <div className="absolute left-12 top-full z-50 mt-1 w-64 rounded-lg border bg-popover shadow-lg overflow-hidden">
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-medium tracking-wider border-b flex items-center gap-1.5">
              <User className="w-3 h-3" /> OBJECTS
            </div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {filteredObjects.length === 0 && !canCreate && (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                  <User className="w-4 h-4 mx-auto mb-1 opacity-40" />
                  Type a name to create an object
                </div>
              )}
              {filteredObjects.map((person, i) => {
                const objType = allTypes.find(t => t.id === (person.typeId ?? 'person'))
                return (
                  <button key={person.id}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left", i === mentionIdx && 'bg-accent')}
                    onMouseDown={e => { e.preventDefault(); insertMention(person.name) }}
                  >
                    <span className="text-base leading-none">{person.emoji}</span>
                    <span className="flex-1">{person.name}</span>
                    {objType && <span className="text-[10px] text-muted-foreground/60">{objType.name}</span>}
                  </button>
                )
              })}
              {canCreate && (
                <>
                  {filteredObjects.length > 0 && <div className="border-t my-1" />}
                  {!showNewTypeForm && <div className="px-2 py-1 text-[10px] text-muted-foreground/60 font-medium">Create as…</div>}
                  {!showNewTypeForm && createOptions.map((objType, i) => (
                    <button key={objType.id}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left",
                        filteredObjects.length + i === mentionIdx && 'bg-accent')}
                      onMouseDown={e => { e.preventDefault(); const p = onCreatePerson(trimmedFilter, objType.id); insertMention(p.name) }}
                    >
                      <span className="text-base leading-none">{objType.emoji}</span>
                      <span className="text-muted-foreground flex-1">
                        <span className="text-foreground font-medium">{trimmedFilter}</span>
                        <span className="text-muted-foreground"> · {objType.name}</span>
                      </span>
                    </button>
                  ))}
                  {!showNewTypeForm && (
                    <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-left text-muted-foreground border-t mt-1 pt-2"
                      onMouseDown={e => { e.preventDefault(); setShowNewTypeForm(true); setNewTypeName(''); setNewTypeEmoji('🔖') }}>
                      <Plus className="w-3.5 h-3.5" /><span>New type…</span>
                    </button>
                  )}
                  {showNewTypeForm && (
                    <div className="px-3 py-2 space-y-2" onMouseDown={e => e.preventDefault()}>
                      <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">New Type</div>
                      <div className="flex items-center gap-2">
                        <input autoFocus value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                          placeholder="Type name…"
                          className="flex-1 text-sm bg-muted/60 rounded px-2 py-1.5 outline-none border border-transparent focus:border-input"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTypeName.trim()) {
                              e.preventDefault()
                              const newType = onCreateObjectType(newTypeName.trim(), newTypeEmoji)
                              const person = onCreatePerson(trimmedFilter, newType.id)
                              insertMention(person.name); setShowNewTypeForm(false)
                            }
                            if (e.key === 'Escape') setShowNewTypeForm(false)
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {NEW_TYPE_EMOJIS.map(em => (
                          <button key={em}
                            className={cn("w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-base transition-colors", newTypeEmoji === em && 'bg-accent ring-1 ring-primary/30')}
                            onMouseDown={e => { e.preventDefault(); setNewTypeEmoji(em) }}>{em}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button className="flex-1 text-xs px-2 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors font-medium"
                          onMouseDown={e => {
                            e.preventDefault(); if (!newTypeName.trim()) return
                            const newType = onCreateObjectType(newTypeName.trim(), newTypeEmoji)
                            const person = onCreatePerson(trimmedFilter, newType.id)
                            insertMention(person.name); setShowNewTypeForm(false)
                          }}>Create {newTypeEmoji} {newTypeName || '…'}</button>
                        <button className="text-xs px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          onMouseDown={e => { e.preventDefault(); setShowNewTypeForm(false) }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
