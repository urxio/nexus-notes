"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Plus, Search, Hash, FileText, BookOpen, X } from "lucide-react"
import type { Note, Person, ObjectType } from "../types"
import { BUILTIN_OBJECT_TYPES } from "../lib/storage"

export function Sidebar({ notes, activeId, search, onSearch, onSelect, onCreate, activeTag, onTagFilter, people, onDeletePerson, objectTypes, onCreateObjectType }: {
  notes: Note[]; activeId: string | null; search: string; onSearch: (q: string) => void
  onSelect: (id: string) => void; onCreate: () => void; activeTag: string | null; onTagFilter: (tag: string | null) => void
  people: Person[]; onDeletePerson: (id: string) => void
  objectTypes: ObjectType[]; onCreateObjectType: (name: string, emoji: string) => void
}) {
  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    notes.forEach(n => n.tags.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [notes])

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Locus Notes</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCreate}>
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New note</TooltipContent>
          </Tooltip>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-8 h-8 text-xs bg-background/70" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Notes list */}
        <div className="p-2 space-y-0.5">
          {notes.map(note => (
            <button key={note.id}
              onClick={() => onSelect(note.id)}
              className={cn(
                "w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 group transition-colors",
                note.id === activeId
                  ? 'bg-background shadow-sm ring-1 ring-border'
                  : 'hover:bg-background/80'
              )}
            >
              <span className="text-base leading-none mt-0.5 flex-shrink-0">{note.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{note.title || 'Untitled'}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {note.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] text-muted-foreground font-mono font-medium">#{tag}</span>
                  ))}
                  {note.tags.length > 3 && <span className="text-[10px] text-muted-foreground/70">+{note.tags.length - 3}</span>}
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: note.color }} />
            </button>
          ))}
          {notes.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
              No notes found
            </div>
          )}
        </div>

        {/* Objects section — built-in types always visible, custom types when populated */}
        {(() => {
          const allTypes = [...BUILTIN_OBJECT_TYPES, ...objectTypes]
          const visibleTypes = allTypes.filter(t =>
            t.isBuiltin || people.some(p => (p.typeId ?? 'person') === t.id)
          )
          if (visibleTypes.length === 0) return null
          return (
            <div className="px-3 pt-2 pb-2 border-t mt-2 space-y-3">
              {visibleTypes.map(objType => {
                const typeObjects = people.filter(p => (p.typeId ?? 'person') === objType.id)
                return (
                  <div key={objType.id}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] leading-none">{objType.emoji}</span>
                      <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider flex-1">{objType.name}</span>
                      {typeObjects.length > 0 && (
                        <span className="text-[10px] text-muted-foreground/40 tabular-nums">{typeObjects.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {typeObjects.map(person => (
                        <div key={person.id} className="group/person flex items-center gap-0.5">
                          <button
                            onClick={() => person.noteId && onSelect(person.noteId)}
                            className={cn(
                              "flex-1 min-w-0 text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors text-sm",
                              person.noteId && activeId === person.noteId
                                ? 'bg-background shadow-sm ring-1 ring-border'
                                : 'hover:bg-background/80 text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <span className="text-sm leading-none flex-shrink-0">{person.emoji}</span>
                            <span className="truncate">{person.name}</span>
                          </button>
                          <button
                            onClick={() => onDeletePerson(person.id)}
                            className="opacity-0 group-hover/person:opacity-100 transition-opacity p-1 rounded hover:text-destructive text-muted-foreground/40 flex-shrink-0"
                            title={`Remove ${objType.name.toLowerCase()}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {typeObjects.length === 0 && (
                        <div className="px-2 py-0.5 text-[11px] text-muted-foreground/35 italic">
                          No {objType.name.toLowerCase()}s yet
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Tag cloud */}
        {allTags.length > 0 && (
          <div className="px-3 pt-2 pb-3 border-t mt-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">Tags</span>
              {activeTag && (
                <button onClick={() => onTagFilter(null)}
                  className="ml-auto text-[9px] text-primary hover:underline">clear</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => {
                const count = notes.filter(n => n.tags.includes(tag)).length
                return (
                  <button key={tag}
                    onClick={() => onTagFilter(activeTag === tag ? null : tag)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border transition-colors font-mono",
                      activeTag === tag
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background/60 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    #{tag} <span className="opacity-60">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <p className="text-[10px] text-muted-foreground/50 text-center">Locus Notes</p>
      </div>
    </div>
  )
}
