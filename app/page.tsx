"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Plus, Network, BookOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import type { Note, Person, ObjectType } from "./types"
import { BUILTIN_OBJECT_TYPES, PERSON_EMOJIS, mkNote, mkPerson, loadNotes, saveNotes, loadPeople, savePeople, loadObjectTypes, saveObjectTypes, normalizeBlocks } from "./lib/storage"
import { GraphPanel } from "./components/GraphPanel"
import { NoteEditor } from "./components/NoteEditor"
import { Sidebar } from "./components/Sidebar"

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [graphOpen, setGraphOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [customObjectTypes, setCustomObjectTypes] = useState<ObjectType[]>([])

  useEffect(() => {
    const loaded = loadNotes().map(n => ({ ...n, blocks: normalizeBlocks(n.blocks) }))
    setNotes(loaded)
    if (loaded.length > 0) setActiveId(loaded[0].id)
    setPeople(loadPeople())
    setCustomObjectTypes(loadObjectTypes())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) saveNotes(notes)
  }, [notes, mounted])

  useEffect(() => {
    if (mounted) savePeople(people)
  }, [people, mounted])

  useEffect(() => {
    if (mounted) saveObjectTypes(customObjectTypes)
  }, [customObjectTypes, mounted])

  function deletePerson(personId: string) {
    const person = people.find(p => p.id === personId)
    if (person?.noteId) {
      setNotes(prev => {
        const rest = prev.filter(n => n.id !== person.noteId)
        if (activeId === person.noteId) setActiveId(rest[0]?.id ?? null)
        return rest
      })
    }
    setPeople(prev => prev.filter(p => p.id !== personId))
  }

  function createObjectType(name: string, emoji: string): ObjectType {
    const newType: ObjectType = { id: crypto.randomUUID(), name, emoji }
    setCustomObjectTypes(prev => [...prev, newType])
    return newType
  }

  function createPerson(name: string, typeId: string = 'person'): Person {
    const allTypes = [...BUILTIN_OBJECT_TYPES, ...customObjectTypes]
    const objType = allTypes.find(t => t.id === typeId)
    const noteEmoji = objType?.emoji ?? PERSON_EMOJIS[Math.floor(Math.random() * PERSON_EMOJIS.length)]
    const personNote: Note = {
      ...mkNote(),
      title: name,
      emoji: noteEmoji,
      blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
      tags: [],
    }
    const person: Person = { ...mkPerson(name), noteId: personNote.id, typeId }
    ;(personNote as any).personId = person.id
    setNotes(prev => [personNote, ...prev])
    setPeople(prev => [...prev, person])
    return person
  }

  const filteredNotes = useMemo(() => {
    let result = notes
    if (activeTag) result = result.filter(n => n.tags.includes(activeTag))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.blocks.some(b => b.content.toLowerCase().includes(q)) ||
        n.tags.some(t => t.includes(q))
      )
    }
    return result
  }, [notes, search, activeTag])

  const activeNote = notes.find(n => n.id === activeId) ?? null

  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => set.add(t)))
    return [...set]
  }, [notes])

  function createNote() {
    const note = mkNote()
    setNotes(prev => [note, ...prev])
    setActiveId(note.id)
    setSearch('')
    setActiveTag(null)
  }

  function updateNote(id: string, patch: Partial<Note>) {
    if (patch.title !== undefined) {
      const personForNote = people.find(p => p.noteId === id)
      if (personForNote && patch.title !== personForNote.name) {
        const oldName = personForNote.name
        const newName = patch.title
        setPeople(prev => prev.map(p => p.id === personForNote.id ? { ...p, name: newName } : p))
        const escOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const mentionRe = new RegExp('@' + escOld, 'g')
        setNotes(prev => prev.map(n => ({
          ...n,
          ...(n.id === id ? patch : {}),
          blocks: n.blocks.map(b => ({
            ...b,
            content: b.content.replace(mentionRe, '@' + newName),
            ...(b.expandedContent != null
              ? { expandedContent: b.expandedContent.replace(mentionRe, '@' + newName) }
              : {}),
          })),
          updatedAt: Date.now(),
        })))
        return
      }
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
  }

  function deleteNote(id: string) {
    setNotes(prev => {
      const rest = prev.filter(n => n.id !== id)
      if (activeId === id) setActiveId(rest[0]?.id ?? null)
      return rest
    })
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
      <div className="flex h-screen overflow-hidden bg-background">

        {/* Sidebar toggle */}
        <button
          className={cn(
            "fixed left-0 top-1/2 -translate-y-1/2 z-50 w-5 h-12 bg-border/60 hover:bg-muted rounded-r-md flex items-center justify-center transition-all",
            sidebarOpen ? 'left-[240px]' : 'left-0'
          )}
          onClick={() => setSidebarOpen(p => !p)}
        >
          {sidebarOpen
            ? <PanelLeftClose className="w-3 h-3 text-muted-foreground" />
            : <PanelLeftOpen className="w-3 h-3 text-muted-foreground" />}
        </button>

        {/* Sidebar */}
        <div className={cn(
          "flex-shrink-0 transition-all duration-200 overflow-hidden",
          sidebarOpen ? 'w-60' : 'w-0'
        )}>
          <div className="w-60 h-full">
            <Sidebar
              notes={filteredNotes}
              activeId={activeId}
              search={search}
              onSearch={setSearch}
              onSelect={id => { setActiveId(id); setSearch('') }}
              onCreate={createNote}
              activeTag={activeTag}
              onTagFilter={setActiveTag}
              people={people}
              onDeletePerson={deletePerson}
              objectTypes={customObjectTypes}
              onCreateObjectType={createObjectType}
            />
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Top toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={graphOpen ? 'secondary' : 'ghost'} size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setGraphOpen(p => !p)}>
                    <Network className="w-3.5 h-3.5" />
                    Graph
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle tag network graph</TooltipContent>
              </Tooltip>
              <ThemeSwitcher />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Note editor */}
            <div className="flex-1 overflow-hidden">
              {activeNote ? (
                <NoteEditor
                  key={activeNote.id}
                  note={activeNote}
                  allTags={allTags}
                  onChange={patch => updateNote(activeNote.id, patch)}
                  onDelete={() => deleteNote(activeNote.id)}
                  people={people}
                  onCreatePerson={createPerson}
                  onNavigateTo={id => setActiveId(id)}
                  objectTypes={customObjectTypes}
                  onCreateObjectType={createObjectType}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <BookOpen className="w-12 h-12 opacity-20" />
                  <div className="text-center">
                    <p className="font-medium">No note selected</p>
                    <p className="text-sm mt-1 opacity-60">Select a note from the sidebar or create a new one</p>
                  </div>
                  <Button onClick={createNote} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> New note
                  </Button>
                </div>
              )}
            </div>

            {/* Graph panel */}
            <div className={cn(
              "flex-shrink-0 border-l transition-all duration-200 overflow-hidden",
              graphOpen ? 'w-80' : 'w-0'
            )}>
              <div className="w-80 h-full">
                <GraphPanel
                  notes={notes}
                  people={people}
                  activeNoteId={activeId}
                  onSelectNote={id => setActiveId(id)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
