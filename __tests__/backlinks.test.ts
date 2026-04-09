import { describe, it, expect } from 'vitest'
import { getBacklinks } from '@/lib/backlinks'
import type { Note, Person } from '@/lib/types'

function makeNote(id: string, blockContents: string[] = [], trashed = false): Note {
  return {
    id,
    title: `Note ${id}`,
    emoji: 'FileText',
    color: '#fff',
    tags: [],
    blocks: blockContents.map((content, i) => ({ id: `${id}-b${i}`, type: 'p' as const, content })),
    createdAt: 0,
    updatedAt: 0,
    ...(trashed ? { trashedAt: Date.now() } : {}),
  }
}

function makePerson(id: string, name: string, noteId?: string): Person {
  return { id, name, emoji: '👤', noteId }
}

describe('getBacklinks', () => {
  it('returns empty array when no notes link to target', () => {
    const notes = [makeNote('a'), makeNote('b')]
    expect(getBacklinks('a', notes, [])).toHaveLength(0)
  })

  it('finds direct data-note-mention links', () => {
    const target = makeNote('target')
    const linker = makeNote('linker', [`Hello <span data-note-mention="target">Note target</span> world`])
    const result = getBacklinks('target', [target, linker], [])
    expect(result).toHaveLength(1)
    expect(result[0].note.id).toBe('linker')
  })

  it('includes a plain-text snippet of the linking block', () => {
    const target = makeNote('target')
    const linker = makeNote('linker', [`Check out <span data-note-mention="target">Note target</span> for details`])
    const result = getBacklinks('target', [target, linker], [])
    expect(result[0].snippet).toContain('Check out')
    expect(result[0].snippet).toContain('for details')
    // Should not contain raw HTML tags
    expect(result[0].snippet).not.toContain('<span')
  })

  it('finds person-mention links when person.noteId === targetNoteId', () => {
    const personNote = makeNote('person-note')
    const linker = makeNote('linker', [`<span data-mention="alice">@Alice</span> did the review`])
    const alice = makePerson('p1', 'Alice', 'person-note')
    const result = getBacklinks('person-note', [personNote, linker], [alice])
    expect(result).toHaveLength(1)
    expect(result[0].note.id).toBe('linker')
  })

  it('does not include the target note itself', () => {
    const target = makeNote('target', [`<span data-note-mention="target">self-link</span>`])
    const result = getBacklinks('target', [target], [])
    expect(result).toHaveLength(0)
  })

  it('does not include trashed notes', () => {
    const target = makeNote('target')
    const trashed = makeNote('linker', [`<span data-note-mention="target">link</span>`], true)
    const result = getBacklinks('target', [target, trashed], [])
    expect(result).toHaveLength(0)
  })

  it('deduplicates: multiple blocks in same note produce one backlink', () => {
    const target = makeNote('target')
    const linker = makeNote('linker', [
      `<span data-note-mention="target">first</span>`,
      `<span data-note-mention="target">second</span>`,
    ])
    const result = getBacklinks('target', [target, linker], [])
    expect(result).toHaveLength(1)
  })

  it('truncates long snippets to ~120 characters', () => {
    const longContent = 'a'.repeat(200)
    const target = makeNote('target')
    const linker = makeNote('linker', [`${longContent} <span data-note-mention="target">link</span>`])
    const result = getBacklinks('target', [target, linker], [])
    expect(result[0].snippet.length).toBeLessThanOrEqual(124) // 120 chars + ellipsis
  })

  it('returns multiple backlinks from different notes', () => {
    const target = makeNote('target')
    const n1 = makeNote('n1', [`<span data-note-mention="target">ref</span>`])
    const n2 = makeNote('n2', [`<span data-note-mention="target">ref</span>`])
    const n3 = makeNote('n3', []) // no link
    const result = getBacklinks('target', [target, n1, n2, n3], [])
    expect(result).toHaveLength(2)
    const ids = result.map(r => r.note.id)
    expect(ids).toContain('n1')
    expect(ids).toContain('n2')
  })
})
