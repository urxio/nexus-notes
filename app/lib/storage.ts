import type { Block, BlockType, Note, ObjectType, Person } from "../types"
import { NOTE_COLORS, NOTE_EMOJIS } from "../constants"

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'locus-notes-v1'
export const PEOPLE_STORAGE_KEY = 'locus-people-v1'
export const OBJECT_TYPES_KEY = 'locus-object-types-v1'

// ─── Built-in Object Types ────────────────────────────────────────────────────

export const BUILTIN_OBJECT_TYPES: ObjectType[] = [
  { id: 'person', name: 'Person', emoji: '👤', isBuiltin: true },
  { id: 'project', name: 'Project', emoji: '📁', isBuiltin: true },
  { id: 'task', name: 'Task', emoji: '✅', isBuiltin: true },
]

export const PERSON_EMOJIS = ['👤', '👩', '👨', '🧑', '👩‍💻', '👨‍💻', '🧑‍🎨', '👩‍🎨', '🧑‍🏫', '👩‍🏫', '👨‍🏫', '🧑‍⚕️']

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_NOTES: Note[] = [
  {
    id: 'seed-1', title: 'Welcome to Locus', emoji: '✨', color: '#6366f1',
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
    id: 'seed-2', title: 'Ideas Board', emoji: '💡', color: '#f59e0b',
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
    id: 'seed-3', title: 'Research Notes', emoji: '🔬', color: '#10b981',
    blocks: [
      { id: 'b1', type: 'h2', content: 'Research Notes' },
      { id: 'b2', type: 'quote', content: "The more I learn, the more I realize how much I don't know. — Socrates" },
      { id: 'b3', type: 'p', content: 'Add your research findings here...' },
      { id: 'b4', type: 'code', content: 'const insight = "shared tags create knowledge graphs"' },
    ],
    tags: ['research', 'ideas'],
    createdAt: Date.now() - 1800000, updatedAt: Date.now(),
  },
]

// ─── Factories ────────────────────────────────────────────────────────────────

export function mkBlock(type: BlockType = 'p'): Block {
  return { id: crypto.randomUUID(), type, content: '' }
}

export function mkNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled',
    emoji: NOTE_EMOJIS[Math.floor(Math.random() * NOTE_EMOJIS.length)],
    color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
    blocks: [{ id: crypto.randomUUID(), type: 'p', content: '' }],
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function mkPerson(name: string): Person {
  return {
    id: crypto.randomUUID(),
    name,
    emoji: PERSON_EMOJIS[Math.floor(Math.random() * PERSON_EMOJIS.length)],
  }
}

// ─── Block normalization ──────────────────────────────────────────────────────
// Splits blocks containing \n into multiple blocks (heals corrupted paste data)

export function normalizeBlocks(blocks: Block[]): Block[] {
  const result: Block[] = []
  for (const b of blocks) {
    if (
      b.type !== 'code' && b.type !== 'date' &&
      b.type !== 'toggle' && b.type !== 'table' &&
      b.content.includes('\n')
    ) {
      const lines = b.content.split(/\r?\n/)
      result.push({ ...b, content: lines[0] })
      for (let i = 1; i < lines.length; i++) {
        result.push({ ...mkBlock('p'), content: lines[i] })
      }
    } else {
      result.push(b)
    }
  }
  return result.length > 0 ? result : [mkBlock('p')]
}

// ─── Load / Save ──────────────────────────────────────────────────────────────

export function loadNotes(): Note[] {
  if (typeof window === 'undefined') return SEED_NOTES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return SEED_NOTES
}

export function saveNotes(notes: Note[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) } catch {}
}

export function loadPeople(): Person[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PEOPLE_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function savePeople(people: Person[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)) } catch {}
}

export function loadObjectTypes(): ObjectType[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OBJECT_TYPES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveObjectTypes(types: ObjectType[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(OBJECT_TYPES_KEY, JSON.stringify(types)) } catch {}
}
