"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  Files, Search, Network, Inbox as InboxIcon, LogOut,
  Plus, X, BookOpen, Hexagon, Command as CmdIcon,
} from "lucide-react"

import { Note, Person, Folder as FolderType, ObjectType, InboxItem } from "@/lib/types"
import { NoteIcon } from "@/components/note-icon"
import { NoteEditor } from "@/components/note-editor"
import { NoteListPanel } from "@/components/note-list-panel"
import { InboxPanel } from "@/components/inbox-panel"
import { GraphPanel } from "@/components/graph-panel"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// ─── Props ──────────────────────────────────────────────────────────────────

export interface TerminalShellProps {
  // Core data
  notes: Note[]
  liveNotes: Note[]
  panelNotes: Note[]
  activeNote: Note | null
  people: Person[]
  folders: FolderType[]
  customObjectTypes: ObjectType[]
  deletedObjectTypes: string[]
  allTags: string[]
  inboxItems: InboxItem[]
  trashCount: number

  // View state
  activeId: string | null
  search: string
  activeTag: string | null
  selectedFolderId: string | null
  selectedObjectTypeId: string | null
  trashView: boolean
  inboxView: boolean
  graphOpen: boolean
  navStack: string[]
  splitNoteId: string | null
  graphWidth: number

  // Setters
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  setActiveTag: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedFolderId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedObjectTypeId: React.Dispatch<React.SetStateAction<string | null>>
  setTrashView: React.Dispatch<React.SetStateAction<boolean>>
  setInboxView: React.Dispatch<React.SetStateAction<boolean>>
  setGraphOpen: React.Dispatch<React.SetStateAction<boolean>>
  setNavStack: React.Dispatch<React.SetStateAction<string[]>>
  setSplitNoteId: React.Dispatch<React.SetStateAction<string | null>>
  setGraphWidth: React.Dispatch<React.SetStateAction<number>>
  setInboxItems: React.Dispatch<React.SetStateAction<InboxItem[]>>

  // Handlers
  createNote: () => void
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void
  restoreNote: (id: string) => void
  permanentlyDeleteNote: (id: string) => void
  moveNoteToFolder: (noteId: string, folderId: string | null) => void
  createPerson: (name: string, typeId?: string) => Person
  navigateTo: (id: string) => void
  navigateToBreadcrumb: (id: string | null) => void
  createObjectType: (name: string, emoji: string) => ObjectType
  deleteTag: (tag: string) => void
  handleSignOut: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TerminalShell(props: TerminalShellProps) {
  const {
    notes, liveNotes, panelNotes, activeNote, people, folders,
    customObjectTypes, deletedObjectTypes, allTags, inboxItems, trashCount,
    activeId, search, activeTag, selectedFolderId, trashView,
    graphOpen, navStack, splitNoteId, graphWidth,
    setActiveId, setSearch, setActiveTag, setSelectedFolderId,
    setTrashView, setGraphOpen, setNavStack, setSplitNoteId,
    setInboxItems,
    createNote, updateNote, deleteNote, restoreNote, permanentlyDeleteNote,
    moveNoteToFolder, createPerson, navigateTo, navigateToBreadcrumb,
    createObjectType, deleteTag, handleSignOut,
  } = props

  // ── Local UI state ──────────────────────────────────────────────────────
  type Pane = 'files' | 'inbox' | null
  const [activePane, setActivePane] = useState<Pane>('files')
  // Open tabs: list of note IDs, most-recent last
  const [openTabs, setOpenTabs] = useState<string[]>([])
  // Command bar
  const [cmdQuery, setCmdQuery] = useState('')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdSel, setCmdSel] = useState(0)
  const cmdRef = useRef<HTMLInputElement>(null)

  // ── Track open tabs when active note changes ────────────────────────────
  useEffect(() => {
    if (!activeId) return
    setOpenTabs(prev => {
      if (prev.includes(activeId)) return prev   // already open
      return [...prev.slice(-5), activeId]        // cap at 6 tabs
    })
  }, [activeId])

  // ── ⌘K global shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
        setTimeout(() => cmdRef.current?.focus(), 40)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── navStack → Note[] for NoteEditor ───────────────────────────────────
  const navStackNotes = useMemo(
    () => navStack.map(id => notes.find(n => n.id === id)).filter((n): n is Note => !!n),
    [navStack, notes]
  )

  // ── Command-bar search results ──────────────────────────────────────────
  const cmdResults = useMemo(() => {
    const base = cmdQuery.trim()
      ? liveNotes.filter(n => {
          const q = cmdQuery.toLowerCase()
          return (
            n.title.toLowerCase().includes(q) ||
            n.tags.some(t => t.includes(q)) ||
            n.blocks.some(b => b.content.toLowerCase().includes(q))
          )
        })
      : [...liveNotes].sort((a, b) => b.updatedAt - a.updatedAt)
    return base.slice(0, 10)
  }, [cmdQuery, liveNotes])

  // ── Helpers ─────────────────────────────────────────────────────────────
  const selectNote = useCallback((id: string) => {
    setActiveId(id)
    setNavStack([])
    setCmdOpen(false)
    setCmdQuery('')
  }, [setActiveId, setNavStack])

  function closeTab(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const next = openTabs.filter(t => t !== id)
    setOpenTabs(next)
    if (id === activeId) setActiveId(next.at(-1) ?? null)
  }

  function handleCmdKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCmdSel(s => Math.min(s + 1, cmdResults.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCmdSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { if (cmdResults[cmdSel]) selectNote(cmdResults[cmdSel].id) }
    else if (e.key === 'Escape') { setCmdOpen(false); setCmdQuery('') }
  }

  const inboxUnread = inboxItems.filter(i => !i.read).length

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="ts-shell">
      {/* Ambient orbs */}
      <div className="ts-orb ts-orb-1" />
      <div className="ts-orb ts-orb-2" />
      <div className="ts-orb ts-orb-3" />

      {/* ── Icon Dock ── */}
      <nav className="ts-glass ts-dock">
        {/* Logo */}
        <div className="ts-dock-logo">
          <Hexagon className="w-4 h-4 text-white opacity-90" />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className={`ts-dock-icon ${activePane === 'files' ? 'ts-active' : ''}`}
              onClick={() => setActivePane(p => p === 'files' ? null : 'files')}>
              <Files className="w-[17px] h-[17px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px] font-mono">Explorer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="ts-dock-icon"
              onClick={() => { setCmdOpen(true); setTimeout(() => cmdRef.current?.focus(), 40) }}>
              <Search className="w-[17px] h-[17px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px] font-mono">Search  ⌘K</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className={`ts-dock-icon ${activePane === 'inbox' ? 'ts-active' : ''}`}
              onClick={() => setActivePane(p => p === 'inbox' ? null : 'inbox')}>
              <InboxIcon className="w-[17px] h-[17px]" />
              {inboxUnread > 0 && <span className="ts-badge">{inboxUnread > 9 ? '9+' : inboxUnread}</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px] font-mono">Inbox</TooltipContent>
        </Tooltip>

        <div className="ts-dock-sep" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button className={`ts-dock-icon ${graphOpen ? 'ts-active' : ''}`}
              onClick={() => { setGraphOpen(p => !p); setSplitNoteId(null) }}>
              <Network className="w-[17px] h-[17px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px] font-mono">Graph</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Theme switcher */}
        <div className="ts-dock-icon" style={{ width: 36, height: 36 }}>
          <ThemeSwitcher />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="ts-dock-icon" onClick={handleSignOut}>
              <LogOut className="w-[16px] h-[16px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px] font-mono">Sign out</TooltipContent>
        </Tooltip>
      </nav>

      {/* ── Explorer: Files ── */}
      {activePane === 'files' && (
        <aside className="ts-glass ts-explorer">
          <div className="ts-explorer-header">
            <span className="ts-explorer-label">Explorer</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="ts-dock-icon" style={{ width: 24, height: 24 }} onClick={createNote}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[11px]">New note</TooltipContent>
            </Tooltip>
          </div>
          <NoteListPanel
            notes={panelNotes}
            folders={folders}
            selectedFolderId={selectedFolderId}
            activeTag={activeTag}
            activeId={activeId}
            onSelect={selectNote}
            onCreate={createNote}
            search={search}
            onSearch={setSearch}
            onMoveNote={moveNoteToFolder}
            onDeleteNote={deleteNote}
            isTrash={trashView}
            onRestoreNote={restoreNote}
            onPermanentDeleteNote={permanentlyDeleteNote}
            onOpenInSplit={id => { setSplitNoteId(id); setGraphOpen(false) }}
          />
        </aside>
      )}

      {/* ── Explorer: Inbox ── */}
      {activePane === 'inbox' && (
        <aside className="ts-glass ts-explorer">
          <div className="ts-explorer-header">
            <span className="ts-explorer-label">Inbox</span>
            <button className="ts-dock-icon" style={{ width: 24, height: 24 }}
              title="Mark all read"
              onClick={() => setInboxItems(prev => prev.map(i => ({ ...i, read: true })))}>
              <span style={{ fontSize: 11, color: 'rgba(78,205,196,0.65)' }}>✓</span>
            </button>
          </div>
          <InboxPanel
            items={inboxItems}
            activeId={activeId}
            onSelectItem={item => {
              selectNote(item.noteId)
              setInboxItems(prev => prev.map(i => i.id === item.id ? { ...i, read: true } : i))
            }}
            onMarkAllRead={() => setInboxItems(prev => prev.map(i => ({ ...i, read: true })))}
            onClearInbox={() => setInboxItems(() => [])}
          />
        </aside>
      )}

      {/* ── Main Editor ── */}
      <main className="ts-glass ts-editor-area">
        {/* Tab bar */}
        {openTabs.length > 0 && (
          <div className="ts-tabbar">
            {openTabs.map(tabId => {
              const tab = notes.find(n => n.id === tabId)
              if (!tab) return null
              const isActive = tabId === activeId
              return (
                <div key={tabId}
                  className={`ts-tab ${isActive ? 'ts-tab-active' : ''}`}
                  onClick={() => selectNote(tabId)}
                >
                  <NoteIcon iconName={tab.emoji} className="w-3 h-3 flex-shrink-0 opacity-60" />
                  <span className="ts-tab-name">{tab.title || 'Untitled'}</span>
                  <button className="ts-tab-x" onClick={e => closeTab(tabId, e)}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )
            })}
            <button
              title="New note"
              onClick={createNote}
              style={{
                marginLeft: 'auto', flexShrink: 0,
                width: 28, height: 28, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(74,107,94,0.50)', cursor: 'pointer',
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(78,205,196,0.65)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(74,107,94,0.45)')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Editor body */}
        <div className="ts-editor-content">
          {activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              allTags={allTags}
              onChange={updateNote}
              onDelete={id => { deleteNote(id); if (id === splitNoteId) setSplitNoteId(null) }}
              people={people}
              onCreatePerson={createPerson}
              onNavigateTo={navigateTo}
              navStack={navStackNotes}
              onBreadcrumbNav={navigateToBreadcrumb}
              objectTypes={customObjectTypes}
              deletedObjectTypes={deletedObjectTypes}
              onCreateObjectType={createObjectType}
              sidebarOpen={activePane !== null}
              onToggleSidebar={() => setActivePane(p => p ? null : 'files')}
              notes={notes}
            />
          ) : (
            <div className="ts-empty">
              <div className="ts-empty-icon">
                <BookOpen className="w-5 h-5" style={{ opacity: 0.35 }} />
              </div>
              <span className="ts-empty-title">No file open</span>
              <span className="ts-empty-sub">
                Select a file from the explorer<br />or create a new one
              </span>
              <button className="ts-new-btn" onClick={createNote}>
                <Plus className="w-3.5 h-3.5" /> new_note.md
              </button>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="ts-statusbar">
          <div className="ts-sb-item" style={{ color: '#4ecdc4', opacity: 0.75 }}>
            <span>◉</span>
            <span style={{ fontSize: 9, letterSpacing: '0.12em' }}>LOCUS</span>
          </div>
          {activeNote && (
            <div className="ts-sb-item">
              <span style={{ color: 'rgba(78,205,196,0.55)' }}>
                {(activeNote.title || 'untitled').toLowerCase().replace(/\s+/g, '_')}.md
              </span>
            </div>
          )}
          {activeNote && (
            <div className="ts-sb-item">
              <span>{activeNote.blocks.length} blocks</span>
            </div>
          )}
          <div className="ts-sb-spacer" />
          {activeNote && (
            <div className="ts-sb-item">
              {activeNote.tags.map(t => (
                <span key={t} style={{ color: '#4a6b5e', fontSize: 10 }}>#{t}</span>
              ))}
            </div>
          )}
          {activeNote && (
            <div className="ts-sb-item">
              <span>{new Date(activeNote.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          <div className="ts-sb-item" style={{ borderRight: 'none' }}>
            <span>Markdown</span>
          </div>
        </div>
      </main>

      {/* ── Graph Panel ── */}
      {graphOpen && (
        <div className="ts-glass ts-graph">
          <GraphPanel
            notes={liveNotes}
            people={people}
            activeNoteId={activeId}
            onSelectNote={selectNote}
            isExpanded={graphWidth > 360}
            onToggleExpand={() => setGraphOpen(p => !p)}
          />
        </div>
      )}

      {/* ── Floating Command Bar ── */}
      <div className="ts-cmd-wrap">
        {cmdOpen && cmdResults.length > 0 && (
          <div className="ts-cmd-results">
            {cmdResults.map((note, i) => (
              <div key={note.id}
                className={`ts-cmd-row ${i === cmdSel ? 'ts-cmd-sel' : ''}`}
                onMouseEnter={() => setCmdSel(i)}
                onClick={() => selectNote(note.id)}
              >
                <NoteIcon iconName={note.emoji} className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                <span className="ts-cmd-title">{note.title || 'Untitled'}</span>
                {note.tags.slice(0, 3).map(t => (
                  <span key={t} className="ts-cmd-tag">#{t}</span>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="ts-glass ts-cmd-bar">
          <CmdIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(74,107,94,0.50)' }} />
          <input
            ref={cmdRef}
            value={cmdQuery}
            placeholder="> Search files, commands..."
            onChange={e => { setCmdQuery(e.target.value); setCmdSel(0) }}
            onFocus={() => setCmdOpen(true)}
            onBlur={() => setTimeout(() => setCmdOpen(false), 140)}
            onKeyDown={handleCmdKey}
          />
          <span style={{ fontSize: 10, color: 'rgba(74,107,94,0.40)', flexShrink: 0, fontFamily: 'var(--font-mono), monospace' }}>⌘K</span>
        </div>
      </div>
    </div>
  )
}
