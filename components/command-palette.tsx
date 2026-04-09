"use client"

import { useEffect, useState } from "react"
import {
    Plus, Network, PanelLeftOpen, Trash2, Bell,
    LogOut, Sun, Moon, Monitor, Hash, Folder as FolderIcon,
} from "lucide-react"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { NoteIcon } from "@/components/note-icon"
import { Note, Folder } from "@/lib/types"

interface CommandPaletteProps {
    isOpen: boolean
    onClose: () => void
    notes: Note[]
    folders: Folder[]
    onNavigateTo: (id: string) => void
    onCreateNote: () => void
    sidebarOpen: boolean
    onToggleSidebar: () => void
    graphOpen: boolean
    onToggleGraph: () => void
    currentTheme: string | undefined
    onSetTheme: (theme: string) => void
    onSignOut: () => void
    trashView: boolean
    onToggleTrash: () => void
    inboxView: boolean
    onToggleInbox: () => void
}

export function CommandPalette({
    isOpen,
    onClose,
    notes,
    folders,
    onNavigateTo,
    onCreateNote,
    sidebarOpen,
    onToggleSidebar,
    graphOpen,
    onToggleGraph,
    currentTheme,
    onSetTheme,
    onSignOut,
    trashView,
    onToggleTrash,
    inboxView,
    onToggleInbox,
}: CommandPaletteProps) {
    const [query, setQuery] = useState("")

    // Reset query when palette opens
    useEffect(() => {
        if (isOpen) setQuery("")
    }, [isOpen])

    function run(fn: () => void) {
        fn()
        onClose()
    }

    // Build folder lookup for note breadcrumbs
    const folderMap = new Map(folders.map(f => [f.id, f]))

    // Live notes sorted: currently open first, then by most recently updated
    const liveNotes = notes
        .filter(n => !n.trashedAt)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 50) // cap to 50 for performance

    return (
        <CommandDialog
            open={isOpen}
            onOpenChange={open => { if (!open) onClose() }}
        >
            <CommandInput
                placeholder="Jump to note or run a command…"
                value={query}
                onValueChange={setQuery}
            />
            <CommandList className="max-h-[420px]">
                <CommandEmpty>No results found.</CommandEmpty>

                {/* ── Notes ─────────────────────────────────────────────── */}
                <CommandGroup heading="Notes">
                    {liveNotes.map(note => {
                        const folder = note.folderId ? folderMap.get(note.folderId) : null
                        return (
                            <CommandItem
                                key={note.id}
                                value={`note:${note.title}:${note.id}`}
                                onSelect={() => run(() => onNavigateTo(note.id))}
                                className="gap-2"
                            >
                                <NoteIcon iconName={note.emoji} className="w-4 h-4 shrink-0 text-muted-foreground" />
                                <span className="flex-1 truncate">{note.title || "Untitled"}</span>
                                {folder && (
                                    <span className="text-xs text-muted-foreground/60 flex items-center gap-1 shrink-0">
                                        <FolderIcon className="w-3 h-3" />
                                        {folder.name}
                                    </span>
                                )}
                            </CommandItem>
                        )
                    })}
                    <CommandItem
                        value="action:new note create"
                        onSelect={() => run(onCreateNote)}
                    >
                        <Plus className="w-4 h-4 text-muted-foreground" />
                        New note
                        <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* ── Navigation ────────────────────────────────────────── */}
                <CommandGroup heading="Navigation">
                    <CommandItem
                        value="action:toggle sidebar panel"
                        onSelect={() => run(onToggleSidebar)}
                    >
                        <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
                        {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                        <CommandShortcut>⌘\</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        value="action:toggle graph knowledge network"
                        onSelect={() => run(onToggleGraph)}
                    >
                        <Network className="w-4 h-4 text-muted-foreground" />
                        {graphOpen ? "Hide graph" : "Show graph"}
                    </CommandItem>
                    <CommandItem
                        value="action:trash deleted notes"
                        onSelect={() => run(onToggleTrash)}
                    >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                        {trashView ? "Exit trash" : "Open trash"}
                    </CommandItem>
                    <CommandItem
                        value="action:inbox reminders notifications"
                        onSelect={() => run(onToggleInbox)}
                    >
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        {inboxView ? "Close inbox" : "Open inbox"}
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {/* ── Theme ─────────────────────────────────────────────── */}
                <CommandGroup heading="Theme">
                    <CommandItem
                        value="action:theme light mode"
                        onSelect={() => run(() => onSetTheme("light"))}
                    >
                        <Sun className="w-4 h-4 text-muted-foreground" />
                        Light
                        {currentTheme === "light" && (
                            <span className="ml-auto text-xs text-muted-foreground">Active</span>
                        )}
                    </CommandItem>
                    <CommandItem
                        value="action:theme dark mode"
                        onSelect={() => run(() => onSetTheme("dark"))}
                    >
                        <Moon className="w-4 h-4 text-muted-foreground" />
                        Dark
                        {currentTheme === "dark" && (
                            <span className="ml-auto text-xs text-muted-foreground">Active</span>
                        )}
                    </CommandItem>
                    <CommandItem
                        value="action:theme terminal IDE hacker"
                        onSelect={() => run(() => onSetTheme("terminal"))}
                    >
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        Terminal
                        {currentTheme === "terminal" && (
                            <span className="ml-auto text-xs text-muted-foreground">Active</span>
                        )}
                    </CommandItem>
                </CommandGroup>

                {/* ── Filter by tag — only shown when query starts with # ─ */}
                {query.startsWith("#") && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Tags">
                            {Array.from(new Set(notes.flatMap(n => n.tags)))
                                .filter(t => t.toLowerCase().includes(query.slice(1).toLowerCase()))
                                .map(tag => (
                                    <CommandItem
                                        key={tag}
                                        value={`tag:${tag}`}
                                        onSelect={() => run(() => onNavigateTo(
                                            notes.find(n => n.tags.includes(tag))?.id ?? ""
                                        ))}
                                    >
                                        <Hash className="w-4 h-4 text-muted-foreground" />
                                        #{tag}
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </>
                )}

                <CommandSeparator />

                {/* ── Account ───────────────────────────────────────────── */}
                <CommandGroup heading="Account">
                    <CommandItem
                        value="action:sign out logout"
                        onSelect={() => run(onSignOut)}
                        className="text-destructive data-[selected=true]:text-destructive"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
