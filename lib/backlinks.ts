import { Note, Person } from "./types"

export interface Backlink {
    /** The note that links to the current note */
    note: Note
    /** Plain-text snippet of the block containing the link */
    snippet: string
}

/**
 * Strip HTML tags and decode common entities to get readable plain text.
 */
function toPlainText(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Returns all notes that link to `targetNoteId`, de-duplicated by source note.
 * Links are detected the same way graph.ts does:
 *   1. data-note-mention="<id>" spans (direct page mentions)
 *   2. data-mention="<name>" spans / @name plain text where the person's
 *      noteId === targetNoteId
 */
export function getBacklinks(
    targetNoteId: string,
    allNotes: Note[],
    allPeople: Person[],
): Backlink[] {
    const linkedPeople = allPeople.filter(p => p.noteId === targetNoteId)
    const results: Backlink[] = []
    const seenNoteIds = new Set<string>()

    for (const note of allNotes) {
        if (note.id === targetNoteId) continue
        if (note.trashedAt) continue

        let firstSnippet: string | null = null

        for (const block of note.blocks) {
            const raw = (block.content ?? '') + ' ' + (block.expandedContent ?? '')
            const rawLower = raw.toLowerCase()

            // 1. Direct note-mention span
            const noteMentionRe = /data-note-mention="([a-zA-Z0-9_-]+)"/g
            let m: RegExpExecArray | null
            while ((m = noteMentionRe.exec(raw)) !== null) {
                if (m[1] === targetNoteId) {
                    firstSnippet = toPlainText(block.content)
                    break
                }
            }

            // 2. Person mention pointing at targetNote
            if (!firstSnippet && linkedPeople.length > 0) {
                for (const person of linkedPeople) {
                    const name = person.name.toLowerCase()
                    if (
                        rawLower.includes(`data-mention="${name}"`) ||
                        toPlainText(rawLower).includes(`@${name}`)
                    ) {
                        firstSnippet = toPlainText(block.content)
                        break
                    }
                }
            }

            if (firstSnippet) break
        }

        if (firstSnippet !== null && !seenNoteIds.has(note.id)) {
            seenNoteIds.add(note.id)
            // Truncate long snippets
            const snippet = firstSnippet.length > 120
                ? firstSnippet.slice(0, 117) + '…'
                : firstSnippet
            results.push({ note, snippet })
        }
    }

    return results
}
