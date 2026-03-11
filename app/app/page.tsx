"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Plus, Search, Hash, Network, FileText, Trash2, X,
  AlignLeft, Heading1, Heading2, Heading3, List, ListOrdered,
  Code2, Quote, CheckSquare, Minus, PanelLeftClose, PanelLeftOpen,
  ChevronRight, BookOpen, Calendar, GripVertical,
  User, Bold, Italic, Strikethrough, Palette, Underline,
  Maximize2, Minimize2, FolderPlus, Pencil, Folder as FolderIcon,
  Sparkles, Rocket, Zap, Atom, Orbit, Terminal, Cpu, Database, Server, BrainCircuit, Bot, Command, Hexagon, Radio, Satellite
} from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useTheme } from "next-themes"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { BlockType, Block, Note, Folder, TreeItem, Person, ObjectType, GNode, GEdge } from "@/lib/types"
import { NOTE_COLORS, NOTE_ICON_KEYS, BLOCK_PLACEHOLDERS, SLASH_MENU_ITEMS, BUILTIN_OBJECT_TYPES, PERSON_EMOJIS } from "@/lib/constants"
import { loadFolders, saveFolders, loadObjectTypes, saveObjectTypes, loadDeletedObjectTypes, saveDeletedObjectTypes, loadPeople, savePeople, mkPerson, loadNotes, saveNotes, mkNote, mkBlock, cloneBlock, normalizeBlocks, buildTree, defaultPropertiesForType } from "@/lib/storage"
import { buildGraph, tickSim } from "@/lib/graph"
import { NoteIcon } from "@/components/note-icon"
import { BLOCK_ICONS } from "@/components/block-icons"

import { GraphPanel } from "@/components/graph-panel"
import { DateBlock } from "@/components/date-block"
import { injectMentionsIntoHtml } from "@/lib/mentions"
import { FormatToolbar } from "@/components/format-toolbar"
import { BlockItem } from "@/components/block-item"
import { NavRail } from "@/components/nav-rail"
import { NoteListPanel } from "@/components/note-list-panel"
import { NoteEditor } from "@/components/note-editor"
import { Sidebar } from "@/components/sidebar"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIGHT_BG =
  'radial-gradient(ellipse 80% 65% at  8% 10%, rgba(99,102,241,0.38) 0%, transparent 52%),' +
  'radial-gradient(ellipse 75% 65% at 92% 90%, rgba(139,92,246,0.32) 0%, transparent 52%),' +
  'radial-gradient(ellipse 60% 52% at 82%  8%, rgba(59,130,246,0.28) 0%, transparent 46%),' +
  'radial-gradient(ellipse 50% 44% at 20% 88%, rgba(20,184,166,0.16) 0%, transparent 46%),' +
  '#eef0ff'

const DARK_BG =
  'radial-gradient(ellipse 80% 65% at  8% 10%, rgba(99,102,241,0.18) 0%, transparent 52%),' +
  'radial-gradient(ellipse 75% 65% at 92% 90%, rgba(139,92,246,0.15) 0%, transparent 52%),' +
  'radial-gradient(ellipse 60% 52% at 82%  8%, rgba(59,130,246,0.12) 0%, transparent 46%),' +
  'radial-gradient(ellipse 50% 44% at 20% 88%, rgba(20,184,166,0.08) 0%, transparent 46%),' +
  '#07070f'

export default function NotesPage() {
  const { resolvedTheme } = useTheme()
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [graphOpen, setGraphOpen] = useState(true)
  const [graphWidth, setGraphWidth] = useState(320)
  const graphResizingRef = useRef(false)
  const graphResizeStartRef = useRef({ x: 0, w: 320 })
  const [mounted, setMounted] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [customObjectTypes, setCustomObjectTypes] = useState<ObjectType[]>([])
  const [deletedObjectTypes, setDeletedObjectTypes] = useState<string[]>([])
  const [deleteTypePrompt, setDeleteTypePrompt] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [trashView, setTrashView] = useState(false)
  // Navigation history for chip-based page traversal (breadcrumb trail)
  const [navStack, setNavStack] = useState<string[]>([])

  useEffect(() => {
    const loaded = loadNotes().map(n => ({ ...n, blocks: normalizeBlocks(n.blocks) }))
    setNotes(loaded)
    if (loaded.length > 0) setActiveId(loaded[0].id)
    setPeople(loadPeople())
    setCustomObjectTypes(loadObjectTypes())
    setDeletedObjectTypes(loadDeletedObjectTypes())
    setFolders(loadFolders())
    setMounted(true)
  }, [])

  // Graph panel resize via drag handle
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!graphResizingRef.current) return
      const dx = graphResizeStartRef.current.x - e.clientX   // drag left → wider
      const newW = Math.max(240, Math.min(780, graphResizeStartRef.current.w + dx))
      setGraphWidth(newW)
    }
    function onMouseUp() {
      if (!graphResizingRef.current) return
      graphResizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Auto-save notes
  useEffect(() => {
    if (mounted) saveNotes(notes)
  }, [notes, mounted])

  // Auto-save people
  useEffect(() => {
    if (mounted) savePeople(people)
  }, [people, mounted])

  // Auto-save custom object types
  useEffect(() => {
    if (mounted) saveObjectTypes(customObjectTypes)
  }, [customObjectTypes, mounted])

  // Auto-save deleted object types
  useEffect(() => {
    if (mounted) saveDeletedObjectTypes(deletedObjectTypes)
  }, [deletedObjectTypes, mounted])

  // Auto-save folders
  useEffect(() => {
    if (mounted) saveFolders(folders)
  }, [folders, mounted])

  function deletePerson(personId: string) {
    const person = people.find(p => p.id === personId)
    if (person?.noteId) {
      // Soft-delete: move the person's note to trash so it can be recovered
      setNotes(prev => prev.map(n => n.id === person.noteId ? { ...n, trashedAt: Date.now() } : n))
      if (activeId === person.noteId) {
        const nextNote = notes.find(n => n.id !== person.noteId && !n.trashedAt)
        setActiveId(nextNote?.id ?? null)
        setNavStack([])
      }
    } else {
      // No linked note — just remove the person record directly
      setPeople(prev => prev.filter(p => p.id !== personId))
    }
  }

  function createObjectType(name: string, emoji: string): ObjectType {
    const newType: ObjectType = { id: crypto.randomUUID(), name, emoji }
    setCustomObjectTypes(prev => [...prev, newType])
    return newType
  }

  function deleteObjectType(typeId: string, deleteObjects: boolean) {
    if (deleteObjects) {
      const peopleToDelete = people.filter(p => (p.typeId ?? 'person') === typeId)
      const noteIdsToDelete = peopleToDelete.map(p => p.noteId).filter(Boolean) as string[]
      const updatedNotes = notes.filter(n => !noteIdsToDelete.includes(n.id))
      setNotes(updatedNotes)
      setPeople(prev => prev.filter(p => !peopleToDelete.includes(p)))
      if (activeId && noteIdsToDelete.includes(activeId)) {
        setActiveId(updatedNotes[0]?.id ?? null)
        setNavStack([])
      }
    }

    if (customObjectTypes.some(t => t.id === typeId)) {
      setCustomObjectTypes(prev => prev.filter(t => t.id !== typeId))
    } else {
      setDeletedObjectTypes(prev => [...prev, typeId])
    }
  }

  function createPerson(name: string, typeId: string = 'person'): Person {
    // Create a dedicated note for this person
    const allTypes = [...BUILTIN_OBJECT_TYPES, ...customObjectTypes]
    const objType = allTypes.find(t => t.id === typeId)
    const noteEmoji = objType?.emoji ?? PERSON_EMOJIS[Math.floor(Math.random() * PERSON_EMOJIS.length)]
    const personNote: Note = {
      ...mkNote(noteEmoji),
      title: name,
      emoji: noteEmoji,
      blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
      tags: [],
      properties: defaultPropertiesForType(typeId),
    }
    const person: Person = { ...mkPerson(name, noteEmoji), noteId: personNote.id, typeId }
      // Store personId on the note so we can identify it as a person page
      ; (personNote as any).personId = person.id
    setNotes(prev => [personNote, ...prev])
    setPeople(prev => [...prev, person])
    return person
  }

  // Live (non-trashed) notes — used for graph, tags, people, etc.
  const liveNotes = useMemo(() => notes.filter(n => !n.trashedAt), [notes])
  const trashCount = useMemo(() => notes.filter(n => !!n.trashedAt).length, [notes])

  const panelNotes = useMemo(() => {
    if (trashView) {
      const trashed = notes.filter(n => !!n.trashedAt)
      if (search.trim()) {
        const q = search.toLowerCase()
        return trashed.filter(n =>
          n.title.toLowerCase().includes(q) ||
          n.blocks.some(b => b.content.toLowerCase().includes(q))
        ).sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))
      }
      return [...trashed].sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))
    }
    let result = liveNotes
    if (selectedFolderId !== null) {
      result = result.filter(n => (n.folderId ?? null) === selectedFolderId)
    } else if (activeTag) {
      result = result.filter(n => n.tags.includes(activeTag))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.blocks.some(b => b.content.toLowerCase().includes(q)) ||
        n.tags.some(t => t.includes(q))
      )
    }
    return [...result].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [notes, liveNotes, trashView, selectedFolderId, activeTag, search])

  const activeNote = notes.find(n => n.id === activeId) ?? null

  const allTags = useMemo(() => {
    const set = new Set<string>()
    liveNotes.forEach(n => n.tags.forEach(t => set.add(t)))
    return [...set]
  }, [liveNotes])

  function createNote() {
    const note = { ...mkNote('FileText'), folderId: selectedFolderId }
    setNotes(prev => [note, ...prev])
    setActiveId(note.id)
    setNavStack([])
    setSearch('')
    setActiveTag(null)
  }

  /** Navigate to a note via a page-link chip — pushes the current page onto the breadcrumb stack. */
  function navigateTo(targetId: string) {
    setNavStack(prev => activeId ? [...prev, activeId] : prev)
    setActiveId(targetId)
  }

  /** Navigate to a breadcrumb item (null = Notes root). Trims the stack to that position. */
  function navigateToBreadcrumb(targetId: string | null) {
    if (targetId === null) {
      setNavStack([])
      setActiveId(null)
    } else {
      const idx = navStack.indexOf(targetId)
      setNavStack(idx >= 0 ? navStack.slice(0, idx) : [])
      setActiveId(targetId)
    }
  }

  /** Update the display text inside all data-note-mention spans that point to `noteId`. */
  function patchNoteMentionSpans(html: string, noteId: string, newTitle: string): string {
    if (!html || !html.includes(`data-note-mention="${noteId}"`)) return html
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    tmp.querySelectorAll(`[data-note-mention="${noteId}"]`).forEach(span => {
      span.textContent = newTitle || 'Untitled'
    })
    return tmp.innerHTML
  }

  function updateNote(id: string, patch: Partial<Note>) {
    // When a person-linked note's title changes, propagate rename to all @mentions
    if (patch.title !== undefined) {
      const newTitle = patch.title
      const personForNote = people.find(p => p.noteId === id)
      if (personForNote && newTitle !== personForNote.name) {
        const oldName = personForNote.name
        // Update the person's stored name
        setPeople(prev => prev.map(p => p.id === personForNote.id ? { ...p, name: newTitle } : p))
        // Replace @OldName with @NewName AND update data-note-mention spans in every note
        const escOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const mentionRe = new RegExp('@' + escOld, 'g')
        setNotes(prev => prev.map(n => ({
          ...n,
          ...(n.id === id ? patch : {}),
          blocks: n.blocks.map(b => {
            const updContent = patchNoteMentionSpans(
              b.content.replace(mentionRe, '@' + newTitle), id, newTitle
            )
            const updExpanded = b.expandedContent != null
              ? patchNoteMentionSpans(b.expandedContent.replace(mentionRe, '@' + newTitle), id, newTitle)
              : b.expandedContent
            return {
              ...b,
              content: updContent,
              ...(b.expandedContent != null ? { expandedContent: updExpanded } : {}),
            }
          }),
          updatedAt: Date.now(),
        })))
        return
      }
      // Not a person-linked note — still propagate title to data-note-mention spans
      const needsUpdate = notes.some(n =>
        n.id !== id && n.blocks.some(b =>
          b.content.includes(`data-note-mention="${id}"`) ||
          (b.expandedContent || '').includes(`data-note-mention="${id}"`)
        )
      )
      if (needsUpdate) {
        setNotes(prev => prev.map(n => {
          if (n.id === id) return { ...n, ...patch, updatedAt: Date.now() }
          const affected = n.blocks.some(b =>
            b.content.includes(`data-note-mention="${id}"`) ||
            (b.expandedContent || '').includes(`data-note-mention="${id}"`)
          )
          if (!affected) return n
          return {
            ...n,
            blocks: n.blocks.map(b => ({
              ...b,
              content: patchNoteMentionSpans(b.content, id, newTitle),
              ...(b.expandedContent != null
                ? { expandedContent: patchNoteMentionSpans(b.expandedContent, id, newTitle) }
                : {}),
            })),
            updatedAt: Date.now(),
          }
        }))
        return
      }
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
  }

  function deleteNote(id: string) {
    // Soft-delete: move to trash rather than destroy immediately
    setNotes(prev => prev.map(n => n.id === id ? { ...n, trashedAt: Date.now() } : n))
    if (activeId === id) {
      const nextNote = notes.find(n => n.id !== id && !n.trashedAt)
      setActiveId(nextNote?.id ?? null)
      setNavStack([])
    }
  }

  function restoreNote(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, trashedAt: undefined } : n))
  }

  function permanentlyDeleteNote(id: string) {
    // Also clean up linked person if any
    const person = people.find(p => p.noteId === id)
    if (person) setPeople(prev => prev.filter(p => p.id !== person.id))
    const updatedNotes = notes.filter(n => n.id !== id)
    setNotes(updatedNotes)
    if (activeId === id) { setActiveId(null); setNavStack([]) }
  }

  // ─── Folder CRUD ────────────────────────────────────────────────────────────

  function createFolder(name = 'New Folder', parentId: string | null = null) {
    const folder: Folder = {
      id: crypto.randomUUID(),
      name,
      emoji: 'Folder',
      parentId,
      createdAt: Date.now(),
    }
    setFolders(prev => [...prev, folder])
  }

  function renameFolder(id: string, name: string) {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }

  function deleteFolder(id: string) {
    // Collect this folder and all descendants recursively
    function collectDescendantIds(folderId: string, allFolders: Folder[]): string[] {
      const children = allFolders.filter(f => f.parentId === folderId)
      return [folderId, ...children.flatMap(c => collectDescendantIds(c.id, allFolders))]
    }
    const idsToDelete = collectDescendantIds(id, folders)
    // Move notes from deleted folders back to root
    setNotes(prev => prev.map(n =>
      n.folderId && idsToDelete.includes(n.folderId) ? { ...n, folderId: null } : n
    ))
    setFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)))
  }

  function moveNoteToFolder(noteId: string, folderId: string | null) {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n))
  }

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-screen overflow-hidden p-3 gap-3"
        style={{ background: mounted && resolvedTheme === 'dark' ? DARK_BG : LIGHT_BG }}>

        {sidebarOpen && (
          <>
            {/* Col 1: Nav Rail card — glass column, must NOT clip backdrop-blur */}
            <div className="w-[220px] flex-shrink-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(99,102,241,0.14)] ring-1 ring-white/70 dark:ring-white/[0.06]">
              <NavRail
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={id => { setSelectedFolderId(id); setTrashView(false) }}
                people={people}
                objectTypes={customObjectTypes}
                deletedObjectTypes={deletedObjectTypes}
                onPromptDeleteObjectType={setDeleteTypePrompt}
                onDeletePerson={deletePerson}
                onCreatePerson={createPerson}
                onCreateFolder={createFolder}
                onDeleteFolder={deleteFolder}
                onRenameFolder={renameFolder}
                onCreate={createNote}
                activeId={activeId}
                onSelect={id => { setActiveId(id); setNavStack([]) }}
                allTags={allTags}
                activeTag={activeTag}
                onTagFilter={tag => { setActiveTag(tag); setTrashView(false) }}
                graphOpen={graphOpen}
                onToggleGraph={() => setGraphOpen(p => !p)}
                notes={liveNotes}
                onToggleSidebar={() => setSidebarOpen(false)}
                trashCount={trashCount}
                trashView={trashView}
                onSelectTrash={() => { setTrashView(true); setSelectedFolderId(null); setActiveTag(null) }}
              />
            </div>

            {/* Col 2: Note List card */}
            <div className="w-[280px] flex-shrink-0 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.05] dark:ring-white/[0.06]">
              <NoteListPanel
                notes={panelNotes}
                folders={folders}
                selectedFolderId={selectedFolderId}
                activeTag={activeTag}
                activeId={activeId}
                onSelect={id => { setActiveId(id); setNavStack([]) }}
                onCreate={createNote}
                search={search}
                onSearch={setSearch}
                onMoveNote={moveNoteToFolder}
                onDeleteNote={deleteNote}
                isTrash={trashView}
                onRestoreNote={restoreNote}
                onPermanentDeleteNote={permanentlyDeleteNote}
              />
            </div>
          </>
        )}

        {/* Col 3: Editor card + optional Graph card */}
        <div className="flex-1 min-w-0 flex gap-1 overflow-hidden relative">
          <div className="flex-1 overflow-hidden rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.05] dark:ring-white/[0.06] bg-white dark:bg-zinc-950">
            {activeNote ? (
              <NoteEditor
                key={activeNote.id}
                note={activeNote}
                allTags={allTags}
                onChange={updateNote}
                onDelete={deleteNote}
                people={people}
                onCreatePerson={createPerson}
                onNavigateTo={navigateTo}
                navStack={navStack.map(id => notes.find(n => n.id === id)).filter((n): n is Note => !!n)}
                onBreadcrumbNav={navigateToBreadcrumb}
                objectTypes={customObjectTypes}
                deletedObjectTypes={deletedObjectTypes}
                onCreateObjectType={createObjectType}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(true)}
                notes={notes}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                {!sidebarOpen && (
                  <button onClick={() => setSidebarOpen(true)} title="Open sidebar"
                    className="absolute top-5 left-5 z-20 w-8 h-8 rounded-xl bg-[#f9fafb] dark:bg-zinc-800 hover:bg-[#f3f4f6] dark:hover:bg-zinc-700 flex items-center justify-center transition-all shadow-sm border border-[#e5e7eb] dark:border-zinc-700">
                    <PanelLeftOpen className="w-4 h-4 text-[#9ca3af] dark:text-zinc-400" />
                  </button>
                )}
                <div className="w-14 h-14 rounded-2xl bg-[#f9fafb] dark:bg-zinc-800 flex items-center justify-center border border-[#e5e7eb] dark:border-zinc-700">
                  <BookOpen className="w-6 h-6 text-[#d1d5db] dark:text-zinc-700" />
                </div>
                <div className="text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d1d5db] dark:text-zinc-700">No page selected</p>
                  <p className="text-[13px] mt-1 text-[#9ca3af] dark:text-zinc-600">Select a note or create a new one</p>
                </div>
                <button onClick={createNote}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> New note
                </button>
              </div>
            )}
          </div>

          {/* Graph card */}
          {graphOpen && (
            <>
              <div
                className="flex-shrink-0 w-3 flex items-center justify-center cursor-col-resize group z-10 rounded-xl hover:bg-indigo-100/40 dark:hover:bg-zinc-700/30 transition-colors"
                onMouseDown={e => {
                  e.preventDefault()
                  graphResizingRef.current = true
                  graphResizeStartRef.current = { x: e.clientX, w: graphWidth }
                  document.body.style.cursor = 'col-resize'
                  document.body.style.userSelect = 'none'
                }}
              >
                <GripVertical className="w-3 h-3 text-stone-300 dark:text-zinc-700 group-hover:text-orange-500 transition-colors" />
              </div>
              <div className="relative flex-shrink-0 h-full overflow-hidden rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.05] dark:ring-white/[0.06]"
                style={{ width: graphWidth, transition: graphResizingRef.current ? 'none' : 'width 200ms ease' }}>
                <div className="w-full h-full">
                  <GraphPanel
                    notes={liveNotes}
                    people={people}
                    activeNoteId={activeId}
                    onSelectNote={id => { setActiveId(id); setNavStack([]) }}
                    isExpanded={graphWidth > 420}
                    onToggleExpand={() => setGraphWidth(w => w > 420 ? 320 : 580)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Object Type Dialog */}
      <AlertDialog open={!!deleteTypePrompt} onOpenChange={(o: boolean) => { if (!o) setDeleteTypePrompt(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Object Type</AlertDialogTitle>
            <AlertDialogDescription>
              What would you like to do with the existing objects of this type?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => {
              if (deleteTypePrompt) deleteObjectType(deleteTypePrompt, false)
              setDeleteTypePrompt(null)
            }}>
              Keep Objects
            </Button>
            <AlertDialogAction onClick={() => {
              if (deleteTypePrompt) deleteObjectType(deleteTypePrompt, true)
              setDeleteTypePrompt(null)
            }} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              Delete Type & Objects
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
