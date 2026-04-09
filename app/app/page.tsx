"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Plus, FileText, X,
  PanelLeftOpen,
  ChevronLeft, BookOpen, GripVertical, Menu, Network,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Note, Folder, Person, ObjectType, InboxItem, NoteProperty, PropertyType } from "@/lib/types"
import { BUILTIN_OBJECT_TYPES, PERSON_EMOJIS } from "@/lib/constants"
import {
  loadFolders, saveFolders, loadObjectTypes, saveObjectTypes,
  loadDeletedObjectTypes, saveDeletedObjectTypes, loadPeople, savePeople,
  mkPerson, loadNotes, saveNotes, mkNote,
  normalizeBlocks, defaultPropertiesForType, loadInbox, saveInbox,
  dbLoadNotes, dbUpsertNote, dbDeleteNote,
  dbLoadPeople, dbSyncPeople,
  dbLoadFolders, dbSyncFolders,
  dbLoadObjectTypes, dbSyncObjectTypes,
  dbLoadDeletedObjectTypes, dbSyncDeletedObjectTypes,
  dbLoadInbox, dbSyncInbox,
  noteFromDb,
} from "@/lib/storage"
import { getSupabaseClient } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { migrateIfNeeded } from "@/lib/migrate"
import { GraphPanel } from "@/components/graph-panel"
import { NavRail } from "@/components/nav-rail"
import { NoteListPanel } from "@/components/note-list-panel"
import { ObjectBoardPanel } from "@/components/object-board-panel"
import { NoteEditor } from "@/components/note-editor"
import { InboxPanel } from "@/components/inbox-panel"
import { TerminalShell } from "@/components/terminal-shell"
import { CommandPalette } from "@/components/command-palette"
import { useIsMobile } from "@/components/ui/use-mobile"


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

// Terminal: flat warm black, no colour gradients
const TERMINAL_BG = '#0e0e0e'

export default function NotesPage() {
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()

  // ─── Auth / Supabase ────────────────────────────────────────────────────────
  // Stable ref to the Supabase browser client (doesn't change between renders)
  const supabase = useRef(getSupabaseClient())
  // Current authenticated user (null = not signed in or auth not yet loaded)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  // Mirror user in a ref so auto-save effects can read it without re-running
  const userRef = useRef<SupabaseUser | null>(null)
  useEffect(() => { userRef.current = user }, [user])

  // ─── Core state ─────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [graphOpen, setGraphOpen] = useState(true)
  const [graphWidth, setGraphWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    return Number(localStorage.getItem('locus-graph-width') ?? 320)
  })
  const graphResizingRef = useRef(false)
  const graphResizeStartRef = useRef({ x: 0, w: 320 })
  const [col2Width, setCol2Width] = useState(() => {
    if (typeof window === 'undefined') return 280
    return Number(localStorage.getItem('locus-col2-width') ?? 280)
  })
  const col2ResizingRef = useRef(false)
  const col2ResizeStartRef = useRef({ x: 0, w: 280 })
  const [mounted, setMounted] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [customObjectTypes, setCustomObjectTypes] = useState<ObjectType[]>([])
  const [deletedObjectTypes, setDeletedObjectTypes] = useState<string[]>([])
  const [deleteTypePrompt, setDeleteTypePrompt] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [trashView, setTrashView] = useState(false)
  const [selectedObjectTypeId, setSelectedObjectTypeId] = useState<string | null>(null)
  // Split view: shows a second note in place of the graph panel
  const [splitNoteId, setSplitNoteId] = useState<string | null>(null)
  // Navigation history for chip-based page traversal (breadcrumb trail)
  const [navStack, setNavStack] = useState<string[]>([])
  // Inbox / Alive reminders
  const [inboxView, setInboxView] = useState(false)
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [mobileView, setMobileView] = useState<'nav' | 'list' | 'editor' | 'graph'>('list')
  const [mobileSearchFocus, setMobileSearchFocus] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // ─── Mobile: auto-switch to editor when note selected ──────────────────────
  useEffect(() => {
    if (isMobile && activeId) setMobileView('editor')
  }, [isMobile, activeId])

  // ─── Prev-state refs for Supabase diff-sync ─────────────────────────────────
  // Populated during bootstrap so initial data doesn't fire unnecessary upserts
  const prevNotesRef        = useRef<Note[]>([])
  const prevPeopleRef       = useRef<Person[]>([])
  const prevFoldersRef      = useRef<Folder[]>([])
  const prevObjTypesRef     = useRef<ObjectType[]>([])
  const prevDelTypesRef     = useRef<string[]>([])
  const prevInboxRef        = useRef<InboxItem[]>([])

  // Debounce timer for Supabase note upserts — localStorage is written instantly;
  // the cloud sync is batched to avoid a network round-trip on every keystroke.
  const notesSyncTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Bootstrap — async to support Supabase loading ──────────────────────────
  useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      const sb = supabase.current

      // 1. Identify the current user
      const { data: { user: currentUser } } = await sb.auth.getUser().catch(
        (): { data: { user: null } } => ({ data: { user: null } })
      )
      if (!isMounted) return

      let loadedNotes:       Note[]        = []
      let loadedPeople:      Person[]      = []
      let loadedFolders:     Folder[]      = []
      let loadedObjTypes:    ObjectType[]  = []
      let loadedDelTypes:    string[]      = []
      let loadedInbox:       InboxItem[]   = []

      if (currentUser) {
        try {
          // 2a. Migrate any existing localStorage data on first ever login
          await migrateIfNeeded(sb, currentUser.id)

          // 2b. Load all collections from Supabase in parallel
          const [dbNotes, dbPeople, dbFolders, dbObjTypes, dbDelTypes, dbInbox] =
            await Promise.all([
              dbLoadNotes(sb, currentUser.id),
              dbLoadPeople(sb, currentUser.id),
              dbLoadFolders(sb, currentUser.id),
              dbLoadObjectTypes(sb, currentUser.id),
              dbLoadDeletedObjectTypes(sb, currentUser.id),
              dbLoadInbox(sb, currentUser.id),
            ])

          // Use Supabase data if we got anything, otherwise fall back to localStorage
          loadedNotes    = dbNotes.length     > 0 ? dbNotes    : loadNotes()
          loadedPeople   = dbPeople
          loadedFolders  = dbFolders
          loadedObjTypes = dbObjTypes
          loadedDelTypes = dbDelTypes
          loadedInbox    = dbInbox.length     > 0 ? dbInbox    : loadInbox()
        } catch (err) {
          // Supabase unavailable — fall back to localStorage (offline mode)
          console.warn('[locus] Supabase load failed, using localStorage:', err)
          loadedNotes    = loadNotes()
          loadedPeople   = loadPeople()
          loadedFolders  = loadFolders()
          loadedObjTypes = loadObjectTypes()
          loadedDelTypes = loadDeletedObjectTypes()
          loadedInbox    = loadInbox()
        }
      } else {
        // 2c. No auth — pure localStorage mode
        loadedNotes    = loadNotes()
        loadedPeople   = loadPeople()
        loadedFolders  = loadFolders()
        loadedObjTypes = loadObjectTypes()
        loadedDelTypes = loadDeletedObjectTypes()
        loadedInbox    = loadInbox()
      }

      // 3. Normalise blocks and hydrate state
      const normalizedNotes = loadedNotes.map(n => ({ ...n, blocks: normalizeBlocks(n.blocks) }))

      // Guard against React Strict Mode double-invocation
      if (!isMounted) return

      // Seed prev-refs BEFORE setMounted so auto-save effects don't fire false diffs
      prevNotesRef.current    = normalizedNotes
      prevPeopleRef.current   = loadedPeople
      prevFoldersRef.current  = loadedFolders
      prevObjTypesRef.current = loadedObjTypes
      prevDelTypesRef.current = loadedDelTypes
      prevInboxRef.current    = loadedInbox

      setUser(currentUser)
      userRef.current = currentUser
      setNotes(normalizedNotes)
      if (normalizedNotes.length > 0) setActiveId(normalizedNotes[0].id)
      setPeople(loadedPeople)
      setCustomObjectTypes(loadedObjTypes)
      setDeletedObjectTypes(loadedDelTypes)
      setFolders(loadedFolders)
      setInboxItems(loadedInbox)
      setMounted(true)
    }

    bootstrap()
    return () => { isMounted = false }
  }, [])

  // ─── Cmd+K → open command palette ────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // ─── Supabase Realtime — live note sync across tabs / devices ─────────────
  // Subscribes once the user is identified. On any remote INSERT/UPDATE,
  // applies the change only if the incoming updated_at is strictly newer than
  // the local copy (last-write-wins by timestamp). DELETE removes the note.
  useEffect(() => {
    if (!user) return
    const userId = user.id
    const sb = supabase.current

    const channel = sb
      .channel(`locus-notes-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          // Ignore events for other users (belt-and-suspenders; RLS filters on the DB side)
          if (payload.eventType !== 'DELETE') {
            const raw = payload.new as Record<string, unknown>
            if (raw.user_id !== userId) return
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string }).id
            if (deletedId) setNotes(prev => prev.filter(n => n.id !== deletedId))
            return
          }

          // INSERT or UPDATE — merge only if remote is strictly newer
          const incoming = noteFromDb(payload.new as Parameters<typeof noteFromDb>[0])
          setNotes(prev => {
            const existing = prev.find(n => n.id === incoming.id)
            if (!existing) {
              // New note from another device/tab
              return [incoming, ...prev]
            }
            if (incoming.updatedAt <= existing.updatedAt) {
              // Local is same or newer — ignore remote (avoids clobbering in-flight edits)
              return prev
            }
            // Remote is newer — apply it
            return prev.map(n => n.id === incoming.id ? incoming : n)
          })
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [user])

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

  // Col 2 panel resize via drag handle
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!col2ResizingRef.current) return
      const dx = e.clientX - col2ResizeStartRef.current.x
      const newW = Math.max(200, Math.min(480, col2ResizeStartRef.current.w + dx))
      setCol2Width(newW)
    }
    function onMouseUp() {
      if (!col2ResizingRef.current) return
      col2ResizingRef.current = false
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

  // Persist column widths to localStorage
  useEffect(() => { localStorage.setItem('locus-col2-width', String(col2Width)) }, [col2Width])
  useEffect(() => { localStorage.setItem('locus-graph-width', String(graphWidth)) }, [graphWidth])

  // ─── Write-through auto-saves (localStorage + Supabase diff) ─────────────────
  // localStorage is always written first (sync, instant).
  // If the user is authenticated, changed/new/removed records are also synced
  // to Supabase in the background (fire-and-forget via .catch(console.warn)).

  // Notes — diff by updatedAt / trashedAt / lastViewed change or new id.
  // localStorage is written synchronously on every change; Supabase upserts are
  // debounced by 2.5 s to avoid a network round-trip on every keystroke.
  useEffect(() => {
    if (!mounted) return
    saveNotes(notes)
    const u  = userRef.current
    const sb = supabase.current
    if (!u) { prevNotesRef.current = notes; return }

    const snapshotChanged = notes.filter(n => {
      const prev = prevNotesRef.current.find(p => p.id === n.id)
      return (
        !prev ||
        prev.updatedAt  !== n.updatedAt  ||
        prev.trashedAt  !== n.trashedAt  ||
        prev.lastViewed !== n.lastViewed
      )
    })
    const snapshotRemoved = prevNotesRef.current.filter(p => !notes.some(n => n.id === p.id))
    prevNotesRef.current = notes

    if (snapshotChanged.length === 0 && snapshotRemoved.length === 0) return

    // Debounce: clear any pending sync and reschedule
    if (notesSyncTimerRef.current !== null) clearTimeout(notesSyncTimerRef.current)
    notesSyncTimerRef.current = setTimeout(() => {
      notesSyncTimerRef.current = null
      snapshotChanged.forEach(n => dbUpsertNote(sb, n, u.id).catch(console.warn))
      snapshotRemoved.forEach(n => dbDeleteNote(sb, n.id, u.id).catch(console.warn))
    }, 2500)
  }, [notes, mounted])

  // People
  useEffect(() => {
    if (!mounted) return
    savePeople(people)
    const u  = userRef.current
    const sb = supabase.current
    if (!u) { prevPeopleRef.current = people; return }
    dbSyncPeople(sb, people, prevPeopleRef.current, u.id).catch(console.warn)
    prevPeopleRef.current = people
  }, [people, mounted])

  // Custom object types
  useEffect(() => {
    if (!mounted) return
    saveObjectTypes(customObjectTypes)
    const u  = userRef.current
    const sb = supabase.current
    if (!u) { prevObjTypesRef.current = customObjectTypes; return }
    dbSyncObjectTypes(sb, customObjectTypes, prevObjTypesRef.current, u.id).catch(console.warn)
    prevObjTypesRef.current = customObjectTypes
  }, [customObjectTypes, mounted])

  // Deleted object types
  useEffect(() => {
    if (!mounted) return
    saveDeletedObjectTypes(deletedObjectTypes)
    const u  = userRef.current
    const sb = supabase.current
    if (!u) { prevDelTypesRef.current = deletedObjectTypes; return }
    dbSyncDeletedObjectTypes(sb, deletedObjectTypes, prevDelTypesRef.current, u.id).catch(console.warn)
    prevDelTypesRef.current = deletedObjectTypes
  }, [deletedObjectTypes, mounted])

  // Folders
  useEffect(() => {
    if (!mounted) return
    saveFolders(folders)
    const u  = userRef.current
    const sb = supabase.current
    if (!u) { prevFoldersRef.current = folders; return }
    dbSyncFolders(sb, folders, prevFoldersRef.current, u.id).catch(console.warn)
    prevFoldersRef.current = folders
  }, [folders, mounted])

  // Inbox items
  useEffect(() => {
    if (!mounted) return
    saveInbox(inboxItems)
    const u  = userRef.current
    const sb = supabase.current
    if (!u) { prevInboxRef.current = inboxItems; return }
    dbSyncInbox(sb, inboxItems, prevInboxRef.current, u.id).catch(console.warn)
    prevInboxRef.current = inboxItems
  }, [inboxItems, mounted])

  // Track lastViewed: update when the active note changes (or when app first mounts)
  useEffect(() => {
    if (!activeId || !mounted) return
    setNotes(prev => prev.map(n =>
      n.id === activeId ? { ...n, lastViewed: new Date().toISOString() } : n
    ))
  }, [activeId, mounted])

  // ─── Reminder engine ──────────────────────────────────────────────────────

  function stripHtmlForReminder(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1').replace(/~~(.*?)~~/g, '$1')
      .replace(/^[-*+]\s+/gm, '').replace(/^\d+\.\s+/gm, '')
      .trim()
  }

  function getNotePreview(note: Note): string {
    for (const block of note.blocks) {
      if (block.type !== 'divider' && block.content.trim()) {
        const plain = stripHtmlForReminder(block.content)
        if (plain) return plain.slice(0, 120)
      }
    }
    return ''
  }

  function getNoteContentText(note: Note): string {
    return note.blocks.map(b => stripHtmlForReminder(b.content + (b.expandedContent ?? ''))).join(' ')
  }

  function getNoteDateProp(note: Note, propName: string): string | null {
    const prop = note.properties?.find(p => p.name === propName && p.type === 'date')
    return prop?.value ? String(prop.value) : null
  }

  function daysDiff(isoDate: string): number {
    return (new Date(isoDate).getTime() - Date.now()) / 86_400_000
  }

  function generateReminders(currentNotes: Note[], currentPeople: Person[], currentInbox: InboxItem[]) {
    const liveNotes = currentNotes.filter(n => !n.trashedAt)
    const newItems: InboxItem[] = []
    // Deduplicate against *unread* items only — so re-alerting works after user reads+acks
    const existing = new Set(currentInbox.filter(i => !i.read).map(i => `${i.noteId}::${i.type}`))

    for (const note of liveNotes) {
      // Determine the note's object type (via linked Person record)
      const linkedPerson = currentPeople.find(p => p.noteId === note.id)
      const resolvedType = note.noteType ?? (linkedPerson?.typeId as Note['noteType']) ?? 'general'

      const key = (t: InboxItem['type']) => `${note.id}::${t}`
      const preview = getNotePreview(note)
      const sender = `Note: ${note.title || 'Untitled'}`

      // 1. task_due — task with Due Date within 7 days
      if (resolvedType === 'task' && !existing.has(key('task_due'))) {
        const dueIso = note.dueDate ?? getNoteDateProp(note, 'Due Date')
        if (dueIso) {
          const d = daysDiff(dueIso)
          if (d <= 7) {
            const daysLabel = d < 0
              ? `${Math.abs(Math.floor(d))} day${Math.abs(Math.floor(d)) !== 1 ? 's' : ''} overdue`
              : d < 1 ? 'today' : d < 2 ? 'tomorrow' : `in ${Math.ceil(d)} days`
            newItems.push({ id: crypto.randomUUID(), noteId: note.id, type: 'task_due',
              subject: `Task "${note.title || 'Untitled'}" is due ${daysLabel}`,
              sender, preview, timestamp: new Date().toISOString(), read: false })
          }
        }
      }

      // 2. project_milestone — project with End Date within 14 days
      if (resolvedType === 'project' && !existing.has(key('project_milestone'))) {
        const dueIso = note.dueDate ?? getNoteDateProp(note, 'End Date')
        if (dueIso) {
          const d = daysDiff(dueIso)
          if (d <= 14) {
            newItems.push({ id: crypto.randomUUID(), noteId: note.id, type: 'project_milestone',
              subject: `Project "${note.title || 'Untitled'}" milestone approaching`,
              sender, preview, timestamp: new Date().toISOString(), read: false })
          }
        }
      }

      // 3. person_stale — person note not viewed in 30+ days
      if (resolvedType === 'person' && !existing.has(key('person_stale'))) {
        const lv = note.lastViewed ?? new Date(note.updatedAt).toISOString()
        const daysSince = (Date.now() - new Date(lv).getTime()) / 86_400_000
        if (daysSince >= 30) {
          newItems.push({ id: crypto.randomUUID(), noteId: note.id, type: 'person_stale',
            subject: `It's been a while since you checked in with ${note.title || 'Untitled'}`,
            sender, preview, timestamp: new Date().toISOString(), read: false })
        }
      }

      // 4. meeting_upcoming — meeting with Date within 3 days
      if (resolvedType === 'meeting' && !existing.has(key('meeting_upcoming'))) {
        const dueIso = note.dueDate ?? getNoteDateProp(note, 'Date')
        if (dueIso) {
          const d = daysDiff(dueIso)
          if (d <= 3) {
            newItems.push({ id: crypto.randomUUID(), noteId: note.id, type: 'meeting_upcoming',
              subject: `Upcoming meeting: ${note.title || 'Untitled'}`,
              sender, preview, timestamp: new Date().toISOString(), read: false })
          }
        }
      }

      // 5. followup_keyword — note content has "follow up" or "remind me", modified recently
      if (!existing.has(key('followup_keyword'))) {
        const contentText = getNoteContentText(note).toLowerCase()
        const hasKeyword = contentText.includes('follow up') || contentText.includes('remind me')
        const recentlyEdited = (Date.now() - note.updatedAt) / 86_400_000 <= 7
        if (hasKeyword && recentlyEdited) {
          newItems.push({ id: crypto.randomUUID(), noteId: note.id, type: 'followup_keyword',
            subject: `Follow-up reminder: ${note.title || 'Untitled'}`,
            sender, preview, timestamp: new Date().toISOString(), read: false })
        }
      }

      // 6. catch_up — any note not viewed in 60+ days
      if (!existing.has(key('catch_up'))) {
        const lv = note.lastViewed ?? new Date(note.updatedAt).toISOString()
        const daysSince = (Date.now() - new Date(lv).getTime()) / 86_400_000
        if (daysSince >= 60) {
          newItems.push({ id: crypto.randomUUID(), noteId: note.id, type: 'catch_up',
            subject: `Catch up on this note: ${note.title || 'Untitled'}`,
            sender: 'System', preview, timestamp: new Date().toISOString(), read: false })
        }
      }
    }

    if (newItems.length > 0) {
      setInboxItems(prev => [...newItems, ...prev].slice(0, 100))
      toast({ description: `📬 ${newItems.length === 1 ? 'New reminder' : `${newItems.length} new reminders`} in your inbox` })
    }
  }

  // Keep refs to latest state/function for use inside setInterval (avoids stale closures)
  const latestNotesRef = useRef<Note[]>([])
  const latestPeopleRef = useRef<Person[]>([])
  const latestInboxRef = useRef<InboxItem[]>([])
  const generateRemindersRef = useRef(generateReminders)
  useEffect(() => { latestNotesRef.current = notes }, [notes])
  useEffect(() => { latestPeopleRef.current = people }, [people])
  useEffect(() => { latestInboxRef.current = inboxItems }, [inboxItems])
  useEffect(() => { generateRemindersRef.current = generateReminders })

  // Run reminder engine on mount and every 5 minutes
  useEffect(() => {
    if (!mounted) return
    generateRemindersRef.current(latestNotesRef.current, latestPeopleRef.current, latestInboxRef.current)
    const interval = setInterval(() => {
      generateRemindersRef.current(latestNotesRef.current, latestPeopleRef.current, latestInboxRef.current)
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

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

  async function handleSignOut() {
    if (user) {
      await supabase.current.auth.signOut()
    } else {
      // Local-only mode — clear the bypass cookie
      document.cookie = 'locus-local-mode=; path=/; max-age=0; SameSite=Lax'
    }
    router.push('/auth')
    router.refresh()
  }

  function createObjectType(name: string, emoji: string): ObjectType {
    const newType: ObjectType = { id: crypto.randomUUID(), name, emoji }
    setCustomObjectTypes(prev => [...prev, newType])
    return newType
  }

  function updateObjectType(id: string, updates: { name?: string; emoji?: string }) {
    setCustomObjectTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
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
    // Inherit the current shared schema for this type (from an existing sibling note),
    // falling back to static defaults for brand-new types with no siblings yet.
    const inheritedSchema = schemaForType(typeId)
    const properties: NoteProperty[] = inheritedSchema.map(p => ({
      ...p,
      id: crypto.randomUUID(), // fresh id so each note has independent property instances
      value: defaultPropertyValue(p.type),
    }))
    const personNote: Note = {
      ...mkNote(noteEmoji),
      title: name,
      emoji: noteEmoji,
      blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
      tags: [],
      properties,
    }
    const person: Person = { ...mkPerson(name, noteEmoji), noteId: personNote.id, typeId }
      // Store personId on the note so we can identify it as a person page
      ; personNote.personId = person.id
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

  /** Returns a blank value for a given property type (used when adding a schema property to sibling notes). */
  function defaultPropertyValue(type: PropertyType): NoteProperty['value'] {
    if (type === 'checkbox') return false
    if (type === 'multi_select' || type === 'person') return []
    return null
  }

  /** Returns the current shared property schema for a given object typeId
   *  by reading the first sibling note's properties (excluding a note to skip). */
  function schemaForType(typeId: string, skipNoteId?: string): NoteProperty[] {
    const sibling = people.find(p => (p.typeId ?? 'person') === typeId && p.noteId && p.noteId !== skipNoteId)
    const sibNote = sibling ? notes.find(n => n.id === sibling.noteId) : null
    return sibNote?.properties ?? defaultPropertiesForType(typeId)
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
    // ── Propagate property schema changes to all sibling notes of the same object type ──
    if (patch.properties !== undefined) {
      const ownerPerson = people.find(p => p.noteId === id)
      if (ownerPerson) {
        const typeId = ownerPerson.typeId ?? 'person'
        const currentNote = notes.find(n => n.id === id)
        const oldProps: NoteProperty[] = currentNote?.properties ?? []
        const newProps: NoteProperty[] = patch.properties

        const addedProps    = newProps.filter(np => !oldProps.some(op => op.id === np.id))
        const removedIds    = oldProps.filter(op => !newProps.some(np => np.id === op.id)).map(p => p.id)
        const schemaChanged = newProps.filter(np => {
          const old = oldProps.find(op => op.id === np.id)
          if (!old) return false
          return old.name !== np.name || old.type !== np.type ||
            JSON.stringify(old.options ?? []) !== JSON.stringify(np.options ?? [])
        })

        if (addedProps.length > 0 || removedIds.length > 0 || schemaChanged.length > 0) {
          const siblingNoteIds = new Set(
            people
              .filter(p => p.noteId && p.noteId !== id && (p.typeId ?? 'person') === typeId)
              .map(p => p.noteId as string)
          )
          setNotes(prev => prev.map(n => {
            if (n.id === id) return { ...n, ...patch, updatedAt: Date.now() }
            if (!siblingNoteIds.has(n.id)) return n
            let sibProps = [...(n.properties ?? [])]
            sibProps = sibProps.filter(p => !removedIds.includes(p.id))
            for (const added of addedProps) {
              if (!sibProps.some(p => p.id === added.id)) {
                sibProps.push({ ...added, value: defaultPropertyValue(added.type) })
              }
            }
            for (const changed of schemaChanged) {
              sibProps = sibProps.map(p =>
                p.id === changed.id
                  ? { ...p, name: changed.name, type: changed.type, options: changed.options }
                  : p
              )
            }
            return { ...n, properties: sibProps, updatedAt: Date.now() }
          }))
          return
        }
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

  function deleteTag(tag: string) {
    setNotes(prev => prev.map(n =>
      n.tags.includes(tag) ? { ...n, tags: n.tags.filter(t => t !== tag), updatedAt: Date.now() } : n
    ))
    if (activeTag === tag) setActiveTag(null)
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

  // ── Show skeleton while bootstrap is loading (avoids flash of empty state) ─
  if (!mounted) {
    return (
      <div className="flex h-screen overflow-hidden p-3 gap-3" style={{ background: LIGHT_BG }}>
        {/* Sidebar skeleton */}
        <div className="w-12 shrink-0 rounded-xl bg-white/30 dark:bg-zinc-900/30 animate-pulse" />
        {/* Note list skeleton */}
        <div className="w-64 shrink-0 flex flex-col gap-3 rounded-xl bg-white/30 dark:bg-zinc-900/30 p-4 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-3/5 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        {/* Editor skeleton */}
        <div className="flex-1 flex flex-col gap-4 rounded-xl bg-white/30 dark:bg-zinc-900/30 p-6 animate-pulse">
          <div className="h-6 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-4/5 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    )
  }

  // ── Terminal mode: render the full glassmorphism IDE shell ───────────────
  if (resolvedTheme === 'terminal') {
    return (
      <TooltipProvider delayDuration={400}>
        <TerminalShell
          notes={notes}
          liveNotes={liveNotes}
          panelNotes={panelNotes}
          activeNote={activeNote}
          people={people}
          folders={folders}
          customObjectTypes={customObjectTypes}
          deletedObjectTypes={deletedObjectTypes}
          allTags={allTags}
          inboxItems={inboxItems}
          trashCount={trashCount}
          activeId={activeId}
          search={search}
          activeTag={activeTag}
          selectedFolderId={selectedFolderId}
          selectedObjectTypeId={selectedObjectTypeId}
          trashView={trashView}
          inboxView={inboxView}
          graphOpen={graphOpen}
          navStack={navStack}
          splitNoteId={splitNoteId}
          graphWidth={graphWidth}
          setActiveId={setActiveId}
          setSearch={setSearch}
          setActiveTag={setActiveTag}
          setSelectedFolderId={setSelectedFolderId}
          setSelectedObjectTypeId={setSelectedObjectTypeId}
          setTrashView={setTrashView}
          setInboxView={setInboxView}
          setGraphOpen={setGraphOpen}
          setNavStack={setNavStack}
          setSplitNoteId={setSplitNoteId}
          setGraphWidth={setGraphWidth}
          setInboxItems={setInboxItems}
          createNote={createNote}
          updateNote={updateNote}
          deleteNote={deleteNote}
          restoreNote={restoreNote}
          permanentlyDeleteNote={permanentlyDeleteNote}
          moveNoteToFolder={moveNoteToFolder}
          createPerson={createPerson}
          navigateTo={navigateTo}
          navigateToBreadcrumb={navigateToBreadcrumb}
          createObjectType={createObjectType}
          deleteTag={deleteTag}
          handleSignOut={handleSignOut}
        />
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          notes={notes}
          folders={folders}
          onNavigateTo={navigateTo}
          onCreateNote={() => { createNote(); setCommandPaletteOpen(false) }}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          graphOpen={graphOpen}
          onToggleGraph={() => setGraphOpen(v => !v)}
          currentTheme={resolvedTheme}
          onSetTheme={setTheme}
          onSignOut={handleSignOut}
          trashView={trashView}
          onToggleTrash={() => setTrashView(v => !v)}
          inboxView={inboxView}
          onToggleInbox={() => setInboxView(v => !v)}
        />
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
              }}>Keep Objects</Button>
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

  return (
    <TooltipProvider delayDuration={400}>
      <div className={cn("flex h-screen overflow-hidden", isMobile ? "flex-col p-0 gap-0" : "p-3 gap-3")}
        style={{ background: !mounted ? LIGHT_BG : resolvedTheme === 'terminal' ? TERMINAL_BG : resolvedTheme === 'dark' ? DARK_BG : LIGHT_BG }}>

        {/* ═══ MOBILE LAYOUT ═══ */}
        {isMobile ? (
          <>
            {/* Mobile: Nav view */}
            {mobileView === 'nav' && (
              <div className="flex-1 overflow-hidden bg-white/80 dark:bg-zinc-950/80 pb-16">
                <NavRail
                  folders={folders}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={id => { setSelectedFolderId(id); setTrashView(false); setSelectedObjectTypeId(null); setInboxView(false); setMobileView('list') }}
                  people={people}
                  objectTypes={customObjectTypes}
                  deletedObjectTypes={deletedObjectTypes}
                  onPromptDeleteObjectType={setDeleteTypePrompt}
                  onDeletePerson={deletePerson}
                  onCreatePerson={createPerson}
                  onCreateFolder={createFolder}
                  onDeleteFolder={deleteFolder}
                  onRenameFolder={renameFolder}
                  onCreate={() => { createNote(); setMobileView('editor') }}
                  activeId={activeId}
                  onSelect={id => { setActiveId(id); setNavStack([]) }}
                  allTags={allTags}
                  activeTag={activeTag}
                  onTagFilter={tag => { setActiveTag(tag); setTrashView(false); setSelectedObjectTypeId(null); setInboxView(false); setMobileView('list') }}
                  graphOpen={false}
                  onToggleGraph={() => {}}
                  notes={liveNotes}
                  onToggleSidebar={() => setMobileView('list')}
                  trashCount={trashCount}
                  trashView={trashView}
                  onSelectTrash={() => { setTrashView(true); setSelectedFolderId(null); setActiveTag(null); setSelectedObjectTypeId(null); setInboxView(false); setMobileView('list') }}
                  selectedObjectTypeId={selectedObjectTypeId}
                  onSelectObjectType={typeId => {
                    setSelectedObjectTypeId(typeId); setTrashView(false); setSelectedFolderId(null); setActiveTag(null); setInboxView(false); setMobileView('list')
                  }}
                  inboxView={inboxView}
                  inboxUnread={inboxItems.filter(i => !i.read).length}
                  onSelectInbox={() => {
                    setInboxView(true); setTrashView(false); setSelectedFolderId(null); setActiveTag(null); setSelectedObjectTypeId(null); setMobileView('list')
                  }}
                  onSignOut={handleSignOut}
                  onDeleteTag={deleteTag}
                  onCreateObjectType={createObjectType}
                  onUpdateObjectType={updateObjectType}
                />
              </div>
            )}

            {/* Mobile: List view */}
            {mobileView === 'list' && (
              <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950 pb-16">
                {(() => {
                  if (inboxView) {
                    return (
                      <InboxPanel
                        items={inboxItems}
                        activeId={activeId}
                        onSelectItem={item => {
                          setActiveId(item.noteId); setNavStack([])
                          setInboxItems(prev => prev.map(i => i.id === item.id ? { ...i, read: true } : i))
                        }}
                        onMarkAllRead={() => setInboxItems(prev => prev.map(i => ({ ...i, read: true })))}
                        onClearInbox={() => setInboxItems([])}
                      />
                    )
                  }
                  const allTypes = [...BUILTIN_OBJECT_TYPES, ...customObjectTypes]
                  const boardType = selectedObjectTypeId ? allTypes.find(t => t.id === selectedObjectTypeId) : null
                  if (boardType) {
                    const boardObjects = people
                      .filter(p => (p.typeId ?? 'person') === boardType.id)
                      .filter(p => p.noteId && liveNotes.some(n => n.id === p.noteId))
                    return (
                      <ObjectBoardPanel
                        key={boardType.id}
                        objectType={boardType}
                        objects={boardObjects}
                        notes={liveNotes}
                        people={people}
                        activeId={activeId}
                        onSelectObject={id => { setActiveId(id); setNavStack([]) }}
                        onCreateObject={(name, typeId) => createPerson(name, typeId)}
                      />
                    )
                  }
                  return (
                    <NoteListPanel
                      notes={panelNotes}
                      folders={folders}
                      selectedFolderId={selectedFolderId}
                      activeTag={activeTag}
                      activeId={activeId}
                      onSelect={id => { setActiveId(id); setNavStack([]); setMobileSearchFocus(false) }}
                      onCreate={createNote}
                      search={search}
                      onSearch={setSearch}
                      onMoveNote={moveNoteToFolder}
                      onDeleteNote={deleteNote}
                      isTrash={trashView}
                      onRestoreNote={restoreNote}
                      onPermanentDeleteNote={permanentlyDeleteNote}
                      autoFocusSearch={mobileSearchFocus}
                    />
                  )
                })()}
              </div>
            )}

            {/* Mobile: Editor view */}
            {mobileView === 'editor' && (
              <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950 relative pb-16">
                {/* Back button */}
                <button onClick={() => setMobileView('list')} title="Back to notes"
                  className="absolute top-3 left-3 z-30 w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm hover:bg-[#f3f4f6] dark:hover:bg-zinc-700 flex items-center justify-center transition-all shadow-sm border border-[#e5e7eb] dark:border-zinc-700">
                  <ChevronLeft className="w-4 h-4 text-[#6b7280] dark:text-zinc-400" />
                </button>
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
                    sidebarOpen={false}
                    onToggleSidebar={() => setMobileView('nav')}
                    notes={notes}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#f9fafb] dark:bg-zinc-800 flex items-center justify-center border border-[#e5e7eb] dark:border-zinc-700">
                      <BookOpen className="w-6 h-6 text-[#d1d5db] dark:text-zinc-700" />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d1d5db] dark:text-zinc-700">No page selected</p>
                    <p className="text-[13px] mt-1 text-[#9ca3af] dark:text-zinc-600">Select a note from the list</p>
                  </div>
                )}
              </div>
            )}

            {/* Mobile: Graph view */}
            {mobileView === 'graph' && (
              <div className="flex-1 overflow-hidden relative pb-14">
                <GraphPanel
                  notes={liveNotes}
                  people={people}
                  activeNoteId={activeId}
                  onSelectNote={id => { navigateTo(id); setMobileView('editor') }}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                />
              </div>
            )}

            {/* Mobile: Bottom tab bar */}
            <div className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-black/5 dark:border-white/5 flex items-center justify-around px-2 safe-area-pb">
              <button onClick={() => { setMobileSearchFocus(false); setMobileView('nav') }}
                className={cn("flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                  mobileView === 'nav' ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500")}>
                <Menu className="w-5 h-5" />
                <span className="text-[9px] font-medium">Browse</span>
              </button>
              <button onClick={() => { setMobileSearchFocus(false); setMobileView('list') }}
                className={cn("flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                  mobileView === 'list' ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500")}>
                <FileText className="w-5 h-5" />
                <span className="text-[9px] font-medium">Notes</span>
              </button>
              <button onClick={() => { setMobileSearchFocus(false); setMobileView('graph') }}
                className={cn("flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                  mobileView === 'graph' ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500")}>
                <Network className="w-5 h-5" />
                <span className="text-[9px] font-medium">Graph</span>
              </button>
            </div>
          </>
        ) : (
          /* ═══ DESKTOP LAYOUT (unchanged) ═══ */
          <>
        {sidebarOpen && (
          <>
            {/* Col 1: Nav Rail card — glass column, must NOT clip backdrop-blur */}
            <div className="w-[220px] flex-shrink-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(99,102,241,0.14)] ring-1 ring-white/70 dark:ring-white/[0.06]">
              <NavRail
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={id => { setSelectedFolderId(id); setTrashView(false); setSelectedObjectTypeId(null); setInboxView(false) }}
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
                onTagFilter={tag => { setActiveTag(tag); setTrashView(false); setSelectedObjectTypeId(null); setInboxView(false) }}
                graphOpen={graphOpen}
                onToggleGraph={() => { setGraphOpen(p => !p); setSplitNoteId(null) }}
                notes={liveNotes}
                onToggleSidebar={() => setSidebarOpen(false)}
                trashCount={trashCount}
                trashView={trashView}
                onSelectTrash={() => { setTrashView(true); setSelectedFolderId(null); setActiveTag(null); setSelectedObjectTypeId(null); setInboxView(false) }}
                selectedObjectTypeId={selectedObjectTypeId}
                onSelectObjectType={typeId => {
                  setSelectedObjectTypeId(typeId)
                  setTrashView(false)
                  setSelectedFolderId(null)
                  setActiveTag(null)
                  setInboxView(false)
                }}
                inboxView={inboxView}
                inboxUnread={inboxItems.filter(i => !i.read).length}
                onSelectInbox={() => {
                  setInboxView(true)
                  setTrashView(false)
                  setSelectedFolderId(null)
                  setActiveTag(null)
                  setSelectedObjectTypeId(null)
                }}
                onSignOut={handleSignOut}
                onDeleteTag={deleteTag}
                onCreateObjectType={createObjectType}
                onUpdateObjectType={updateObjectType}
              />
            </div>

            {/* Col 2: Object Board or Note List (resizable) */}
            <div className="flex-shrink-0 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.05] dark:ring-white/[0.06]"
              style={{ width: col2Width, transition: col2ResizingRef.current ? 'none' : 'width 80ms ease' }}>
              {(() => {
                // ── Inbox view ──────────────────────────────────────────────
                if (inboxView) {
                  return (
                    <InboxPanel
                      items={inboxItems}
                      activeId={activeId}
                      onSelectItem={item => {
                        setActiveId(item.noteId)
                        setNavStack([])
                        setInboxItems(prev => prev.map(i => i.id === item.id ? { ...i, read: true } : i))
                      }}
                      onMarkAllRead={() => setInboxItems(prev => prev.map(i => ({ ...i, read: true })))}
                      onClearInbox={() => setInboxItems([])}
                    />
                  )
                }
                // ── Object board or note list ────────────────────────────────
                const allTypes = [...BUILTIN_OBJECT_TYPES, ...customObjectTypes]
                const boardType = selectedObjectTypeId ? allTypes.find(t => t.id === selectedObjectTypeId) : null
                if (boardType) {
                  const boardObjects = people
                    .filter(p => (p.typeId ?? 'person') === boardType.id)
                    .filter(p => p.noteId && liveNotes.some(n => n.id === p.noteId))
                  return (
                    <ObjectBoardPanel
                      key={boardType.id}
                      objectType={boardType}
                      objects={boardObjects}
                      notes={liveNotes}
                      people={people}
                      activeId={activeId}
                      onSelectObject={id => { setActiveId(id); setNavStack([]) }}
                      onCreateObject={(name, typeId) => createPerson(name, typeId)}
                      onOpenInSplit={id => { setSplitNoteId(id); setGraphOpen(false) }}
                    />
                  )
                }
                return (
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
                    onOpenInSplit={id => { setSplitNoteId(id); setGraphOpen(false) }}
                  />
                )
              })()}
            </div>

            {/* Col 2→3 resize handle */}
            <div
              className="flex-shrink-0 w-1 -mx-2 flex items-center justify-center cursor-col-resize group z-10 rounded-xl hover:bg-indigo-100/40 dark:hover:bg-zinc-700/30 transition-colors"
              onMouseDown={e => {
                e.preventDefault()
                col2ResizingRef.current = true
                col2ResizeStartRef.current = { x: e.clientX, w: col2Width }
                document.body.style.cursor = 'col-resize'
                document.body.style.userSelect = 'none'
              }}
            >
              <GripVertical className="w-3 h-3 text-stone-300 dark:text-zinc-700 group-hover:text-indigo-400 transition-colors" />
            </div>
          </>
        )}

        {/* Col 3: Editor card + optional Graph card */}
        <div className="flex-1 min-w-0 flex gap-3 overflow-hidden relative">
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
                  {inboxView ? (
                    <>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d1d5db] dark:text-zinc-700">Inbox</p>
                      <p className="text-[13px] mt-1 text-[#9ca3af] dark:text-zinc-600">Click a reminder to open the note</p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d1d5db] dark:text-zinc-700">No page selected</p>
                      <p className="text-[13px] mt-1 text-[#9ca3af] dark:text-zinc-600">Select a note or create a new one</p>
                    </>
                  )}
                </div>
                {!inboxView && (
                  <button onClick={createNote}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> New note
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Graph card or Split view */}
          {(splitNoteId || graphOpen) && (
            <>
              <div
                className="flex-shrink-0 w-1 -mx-2 flex items-center justify-center cursor-col-resize group z-10 rounded-xl hover:bg-indigo-100/40 dark:hover:bg-zinc-700/30 transition-colors"
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
                {splitNoteId ? (() => {
                  const splitNote = liveNotes.find(n => n.id === splitNoteId)
                  return splitNote ? (
                    <div className="relative w-full h-full bg-white dark:bg-zinc-950">
                      {/* Close split button */}
                      <button
                        onClick={() => setSplitNoteId(null)}
                        title="Close split view"
                        className="absolute top-3 right-3 z-20 w-7 h-7 rounded-xl bg-[#f9fafb] dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-all shadow-sm border border-[#e5e7eb] dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-800 group"
                      >
                        <X className="w-3.5 h-3.5 text-[#9ca3af] dark:text-zinc-400 group-hover:text-red-500 transition-colors" />
                      </button>
                      <NoteEditor
                        key={splitNote.id}
                        note={splitNote}
                        allTags={allTags}
                        onChange={updateNote}
                        onDelete={id => { deleteNote(id); if (id === splitNoteId) setSplitNoteId(null) }}
                        people={people}
                        onCreatePerson={createPerson}
                        onNavigateTo={navigateTo}
                        navStack={navStack.map(id => liveNotes.find(n => n.id === id)).filter((n): n is Note => !!n)}
                        onBreadcrumbNav={navigateToBreadcrumb}
                        objectTypes={customObjectTypes}
                        deletedObjectTypes={deletedObjectTypes}
                        onCreateObjectType={createObjectType}
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(true)}
                        notes={notes}
                      />
                    </div>
                  ) : null
                })() : (
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
                )}
              </div>
            </>
          )}
        </div>
          </>
        )}
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        notes={notes}
        folders={folders}
        onNavigateTo={navigateTo}
        onCreateNote={() => { createNote(); setCommandPaletteOpen(false) }}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        graphOpen={graphOpen}
        onToggleGraph={() => setGraphOpen(v => !v)}
        currentTheme={resolvedTheme}
        onSetTheme={setTheme}
        onSignOut={handleSignOut}
        trashView={trashView}
        onToggleTrash={() => setTrashView(v => !v)}
        inboxView={inboxView}
        onToggleInbox={() => setInboxView(v => !v)}
      />

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
