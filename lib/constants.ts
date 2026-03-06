import {
    Sparkles, Rocket, Zap, Atom, Orbit, Terminal, Cpu, Database, Network, Server, BrainCircuit, Bot, Command, Hexagon, Radio, Satellite
} from "lucide-react"
import { BlockType, ObjectType, Note } from "./types"

export const NOTE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6']

export const FUTURISTIC_ICONS: Record<string, React.ElementType> = {
    Sparkles, Rocket, Zap, Atom, Orbit, Terminal, Cpu, Database, Network, Server, BrainCircuit, Bot, Command, Hexagon, Radio, Satellite
}

export const NOTE_ICON_KEYS = Object.keys(FUTURISTIC_ICONS)
export const LEGACY_NOTE_EMOJIS = ['📝', '💡', '🎯', '📚', '🔬', '🎨', '💻', '🌱', '⚡', '🔥', '📊', '🧠', '✨', '🚀', '🗒️', '📌']

export const BLOCK_LABELS: Record<BlockType, string> = {
    h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', p: 'Paragraph',
    bullet: 'Bullet List', numbered: 'Numbered List', quote: 'Quote',
    code: 'Code Block', divider: 'Divider', todo: 'To-do', date: 'Date',
    toggle: 'Toggle', table: 'Table',
}

export const BLOCK_PLACEHOLDERS: Record<BlockType, string> = {
    h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
    p: "Write something, or type '/' for commands…",
    bullet: 'List item', numbered: 'List item',
    quote: 'Quote…', code: 'Code…', divider: '', todo: 'To-do', date: '',
    toggle: 'Toggle header…', table: 'Table (use | to separate cells)…',
}

export const SLASH_MENU_ITEMS: { type: BlockType; label: string; shortcut?: string }[] = [
    { type: 'p', label: 'Paragraph', shortcut: '' },
    { type: 'h1', label: 'Heading 1', shortcut: '#' },
    { type: 'h2', label: 'Heading 2', shortcut: '##' },
    { type: 'h3', label: 'Heading 3', shortcut: '###' },
    { type: 'toggle', label: 'Toggle', shortcut: '>>' },
    { type: 'bullet', label: 'Bullet List', shortcut: '-' },
    { type: 'numbered', label: 'Numbered List', shortcut: '1.' },
    { type: 'quote', label: 'Quote', shortcut: '>' },
    { type: 'code', label: 'Code Block', shortcut: '```' },
    { type: 'table', label: 'Table', shortcut: 'table' },
    { type: 'todo', label: 'To-do', shortcut: '[]' },
    { type: 'divider', label: 'Divider', shortcut: '---' },
    { type: 'date', label: 'Date', shortcut: '' },
]

export const BUILTIN_OBJECT_TYPES: ObjectType[] = [
    { id: 'person', name: 'Person', emoji: '👤', isBuiltin: true },
    { id: 'project', name: 'Project', emoji: '📁', isBuiltin: true },
    { id: 'task', name: 'Task', emoji: '✅', isBuiltin: true },
    { id: 'meeting', name: 'Meeting', emoji: '📅', isBuiltin: true },
]

export const PERSON_EMOJIS = ['👤', '👩', '👨', '🧑', '👩‍💻', '👨‍💻', '🧑‍🎨', '👩‍🎨', '🧑‍🏫', '👩‍🏫', '👨‍🏫', '🧑‍⚕️']

export const SEED_NOTES: Note[] = [
    {
        id: 'seed-1', title: 'Welcome to Locus', emoji: 'Sparkles', color: '#6366f1',
        blocks: [
            { id: 'b1', type: 'h1', content: 'Welcome to Locus Notes' },
            { id: 'b2', type: 'p', content: 'A block editor with an Obsidian-style tag network. Tags connect notes and appear as edges in the graph view →' },
            { id: 'b3', type: 'bullet', content: 'Type  /  to insert blocks' },
            { id: 'b4', type: 'bullet', content: 'Use  #  shortcuts: # H1, ## H2, - bullets, > quote' },
            { id: 'b5', type: 'bullet', content: 'Add tags at the bottom to connect notes in the graph' },
            { id: 'b6', type: 'bullet', content: 'Click any node in the graph to open that note' },
        ],
        tags: ['welcome', 'getting-started'],
        createdAt: Date.now() - 7200000, updatedAt: Date.now(),
    },
    {
        id: 'seed-2', title: 'Ideas Board', emoji: 'BrainCircuit', color: '#f59e0b',
        blocks: [
            { id: 'b1', type: 'h2', content: 'Ideas to explore' },
            { id: 'b2', type: 'todo', content: 'Build something new', checked: false },
            { id: 'b3', type: 'todo', content: 'Learn a new skill', checked: true },
            { id: 'b4', type: 'todo', content: 'Ship it', checked: false },
            { id: 'b5', type: 'p', content: '' },
        ],
        tags: ['ideas', 'getting-started'],
        createdAt: Date.now() - 3600000, updatedAt: Date.now(),
    },
    {
        id: 'seed-3', title: 'Research Notes', emoji: 'Atom', color: '#10b981',
        blocks: [
            { id: 'b1', type: 'h2', content: 'Research Notes' },
            { id: 'b2', type: 'quote', content: 'The more I learn, the more I realize how much I don\'t know. — Socrates' },
            { id: 'b3', type: 'p', content: 'Add your research findings here...' },
            { id: 'b4', type: 'code', content: 'const insight = "shared tags create knowledge graphs"' },
        ],
        tags: ['research', 'ideas'],
        createdAt: Date.now() - 1800000, updatedAt: Date.now(),
    },
]
