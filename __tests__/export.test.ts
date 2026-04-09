import { describe, it, expect } from 'vitest'
import { noteToMarkdown, noteToJson, titleToFilename } from '@/lib/export'
import type { Note, Block } from '@/lib/types'

function makeNote(overrides: Partial<Note> & { id: string }): Note {
  return {
    title: 'Test Note',
    emoji: 'FileText',
    color: '#fff',
    tags: [],
    blocks: [],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides,
  }
}

function p(content: string): Block {
  return { id: 'b1', type: 'p', content }
}

// ── titleToFilename ───────────────────────────────────────────────────────────

describe('titleToFilename', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(titleToFilename('Hello World')).toBe('hello-world')
  })

  it('strips leading/trailing hyphens', () => {
    expect(titleToFilename('!Hello!')).toBe('hello')
  })

  it('falls back to "untitled" for empty string', () => {
    expect(titleToFilename('')).toBe('untitled')
  })

  it('collapses multiple special chars into one hyphen', () => {
    expect(titleToFilename('foo & bar / baz')).toBe('foo-bar-baz')
  })

  it('truncates to 60 characters', () => {
    const long = 'a'.repeat(80)
    expect(titleToFilename(long).length).toBeLessThanOrEqual(60)
  })
})

// ── noteToMarkdown ────────────────────────────────────────────────────────────

describe('noteToMarkdown', () => {
  it('includes frontmatter with created/updated dates', () => {
    const note = makeNote({ id: 'n1' })
    const md = noteToMarkdown(note)
    expect(md).toContain('---')
    expect(md).toContain('created:')
    expect(md).toContain('updated:')
  })

  it('includes tags in frontmatter when present', () => {
    const note = makeNote({ id: 'n1', tags: ['work', 'important'] })
    const md = noteToMarkdown(note)
    expect(md).toContain('tags: ["work", "important"]')
  })

  it('renders the note title as h1 after frontmatter', () => {
    const note = makeNote({ id: 'n1', title: 'My Note', emoji: '' })
    const md = noteToMarkdown(note)
    expect(md).toContain('# My Note')
  })

  it('converts heading blocks', () => {
    const note = makeNote({
      id: 'n1',
      blocks: [
        { id: 'b1', type: 'h1', content: 'Chapter 1' },
        { id: 'b2', type: 'h2', content: 'Section' },
        { id: 'b3', type: 'h3', content: 'Subsection' },
      ],
    })
    const md = noteToMarkdown(note)
    expect(md).toContain('# Chapter 1')
    expect(md).toContain('## Section')
    expect(md).toContain('### Subsection')
  })

  it('converts todo blocks with checked state', () => {
    const note = makeNote({
      id: 'n1',
      blocks: [
        { id: 'b1', type: 'todo', content: 'Done', checked: true },
        { id: 'b2', type: 'todo', content: 'Pending', checked: false },
      ],
    })
    const md = noteToMarkdown(note)
    expect(md).toContain('- [x] Done')
    expect(md).toContain('- [ ] Pending')
  })

  it('converts bullet blocks', () => {
    const note = makeNote({ id: 'n1', blocks: [{ id: 'b1', type: 'bullet', content: 'item' }] })
    expect(noteToMarkdown(note)).toContain('- item')
  })

  it('converts quote blocks', () => {
    const note = makeNote({ id: 'n1', blocks: [{ id: 'b1', type: 'quote', content: 'wise words' }] })
    expect(noteToMarkdown(note)).toContain('> wise words')
  })

  it('converts divider blocks to ---', () => {
    const note = makeNote({ id: 'n1', blocks: [{ id: 'b1', type: 'divider', content: '' }] })
    // Should contain at least two --- (frontmatter close + divider)
    const count = (noteToMarkdown(note).match(/^---$/gm) ?? []).length
    expect(count).toBeGreaterThanOrEqual(2)
  })

  it('converts inline bold and italic HTML to markdown', () => {
    const note = makeNote({ id: 'n1', blocks: [p('<strong>bold</strong> and <em>italic</em>')] })
    const md = noteToMarkdown(note)
    expect(md).toContain('**bold**')
    expect(md).toContain('*italic*')
  })

  it('converts note-mention spans to [[wiki links]]', () => {
    const linkedNote = makeNote({ id: 'linked', title: 'Linked Page' })
    const note = makeNote({
      id: 'n1',
      blocks: [p('<span data-note-mention="linked">Linked Page</span>')],
    })
    const md = noteToMarkdown(note, [linkedNote])
    expect(md).toContain('[[Linked Page]]')
  })

  it('strips remaining HTML tags from plain paragraphs', () => {
    const note = makeNote({ id: 'n1', blocks: [p('<span class="foo">plain text</span>')] })
    const md = noteToMarkdown(note)
    expect(md).toContain('plain text')
    expect(md).not.toContain('<span')
  })
})

// ── noteToJson ────────────────────────────────────────────────────────────────

describe('noteToJson', () => {
  it('produces valid JSON', () => {
    const note = makeNote({ id: 'n1' })
    expect(() => JSON.parse(noteToJson(note))).not.toThrow()
  })

  it('includes note fields', () => {
    const note = makeNote({ id: 'n1', title: 'My Note', tags: ['a'] })
    const parsed = JSON.parse(noteToJson(note))
    expect(parsed.id).toBe('n1')
    expect(parsed.title).toBe('My Note')
    expect(parsed.tags).toEqual(['a'])
  })

  it('includes _resolved.notes when note mentions are present', () => {
    const linkedNote = makeNote({ id: 'linked', title: 'Linked Page' })
    const note = makeNote({
      id: 'n1',
      blocks: [p('<span data-note-mention="linked">Linked Page</span>')],
    })
    const parsed = JSON.parse(noteToJson(note, [linkedNote]))
    expect(parsed._resolved?.notes?.linked).toBe('Linked Page')
  })

  it('omits _resolved when there are no mentions', () => {
    const note = makeNote({ id: 'n1', blocks: [p('just plain text')] })
    const parsed = JSON.parse(noteToJson(note))
    expect(parsed._resolved).toBeUndefined()
  })
})
