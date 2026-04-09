import { Note, Block, Person } from "./types"

// ── HTML → Markdown conversion ────────────────────────────────────────────────

/**
 * Convert inline HTML (from block.content) to Markdown.
 * Order matters: convert formatting spans before stripping remaining tags.
 */
function htmlToMarkdown(html: string, notes: Note[]): string {
    let md = html

    // note-mention spans → [[Note Title]]
    md = md.replace(
        /<span[^>]*data-note-mention="([a-zA-Z0-9_-]+)"[^>]*>([^<]*)<\/span>/g,
        (_match, noteId: string) => {
            const linked = notes.find(n => n.id === noteId)
            return `[[${linked?.title || noteId}]]`
        }
    )

    // person-mention spans → @Name
    md = md.replace(
        /<span[^>]*data-mention="([^"]+)"[^>]*>([^<]*)<\/span>/g,
        (_match, _name: string, inner: string) => {
            // Use the rendered inner text (already has the @ prefix from injectMentionsIntoHtml)
            return inner.replace(/<[^>]+>/g, '')
        }
    )

    // date chip spans → readable date
    md = md.replace(
        /<span[^>]*data-date="([^"]+)"[^>]*>([^<]*)<\/span>/g,
        (_match, _dateId: string, inner: string) => inner.replace(/<[^>]+>/g, '')
    )

    // Bold
    md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**')

    // Italic
    md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*')
    md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*')

    // Inline code
    md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`')

    // Strikethrough
    md = md.replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
    md = md.replace(/<del>(.*?)<\/del>/gi, '~~$1~~')

    // Underline (no standard MD, use HTML)
    md = md.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')

    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

    // Line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n')

    // Strip remaining tags
    md = md.replace(/<[^>]+>/g, '')

    // Decode entities
    md = md
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")

    return md.trim()
}

function blockToMarkdown(block: Block, index: number, notes: Note[]): string {
    const text = htmlToMarkdown(block.content, notes)

    switch (block.type) {
        case 'h1': return `# ${text}`
        case 'h2': return `## ${text}`
        case 'h3': return `### ${text}`
        case 'p':  return text
        case 'bullet': return `- ${text}`
        case 'numbered': return `${index + 1}. ${text}`
        case 'quote': return `> ${text}`
        case 'code': return `\`\`\`\n${text}\n\`\`\``
        case 'divider': return '---'
        case 'todo': return `- [${block.checked ? 'x' : ' '}] ${text}`
        case 'date': return text ? `📅 ${text}` : ''
        case 'toggle': {
            const summary = text
            const expanded = block.expandedContent
                ? htmlToMarkdown(block.expandedContent, notes)
                : ''
            return expanded
                ? `> **${summary}**\n>\n> ${expanded.replace(/\n/g, '\n> ')}`
                : `> **${summary}**`
        }
        case 'table': return text  // table blocks store pipe-syntax already
        default: return text
    }
}

/**
 * Export a note as a Markdown string.
 * - Heading: emoji + title + frontmatter (tags, dates)
 * - Blocks converted to their Markdown equivalents
 * - Note mentions become [[Wiki Links]], person mentions stay as @Name
 */
export function noteToMarkdown(note: Note, notes: Note[] = []): string {
    const lines: string[] = []

    // Frontmatter
    const frontmatter: string[] = []
    if (note.tags.length > 0) frontmatter.push(`tags: [${note.tags.map(t => `"${t}"`).join(', ')}]`)
    if (note.noteType) frontmatter.push(`type: ${note.noteType}`)
    if (note.dueDate) frontmatter.push(`due: ${note.dueDate}`)
    frontmatter.push(`created: ${new Date(note.createdAt).toISOString()}`)
    frontmatter.push(`updated: ${new Date(note.updatedAt).toISOString()}`)

    lines.push('---')
    lines.push(...frontmatter)
    lines.push('---')
    lines.push('')

    // Title
    lines.push(`# ${note.emoji ? note.emoji + ' ' : ''}${note.title || 'Untitled'}`)
    lines.push('')

    // Blocks — track numbered-list counter
    let numberedIdx = 0
    for (const block of note.blocks) {
        if (block.type === 'numbered') {
            numberedIdx++
        } else {
            numberedIdx = 0
        }
        const rendered = blockToMarkdown(block, numberedIdx - 1, notes)
        if (rendered) lines.push(rendered)
    }

    return lines.join('\n')
}

/**
 * Export a note as a structured JSON object.
 * IDs are kept as-is; linked note titles and person names are resolved
 * into a `_resolved` metadata section for readability.
 */
export function noteToJson(note: Note, notes: Note[] = [], people: Person[] = []): string {
    // Collect referenced note IDs and person names from block content
    const referencedNoteIds = new Set<string>()
    const referencedPersonNames = new Set<string>()

    for (const block of note.blocks) {
        const raw = (block.content ?? '') + ' ' + (block.expandedContent ?? '')
        const noteMentionRe = /data-note-mention="([a-zA-Z0-9_-]+)"/g
        let m: RegExpExecArray | null
        while ((m = noteMentionRe.exec(raw)) !== null) referencedNoteIds.add(m[1])
        const personMentionRe = /data-mention="([^"]+)"/g
        while ((m = personMentionRe.exec(raw)) !== null) referencedPersonNames.add(m[1])
    }

    const resolvedNotes: Record<string, string> = {}
    referencedNoteIds.forEach(id => {
        const linked = notes.find(n => n.id === id)
        if (linked) resolvedNotes[id] = linked.title || 'Untitled'
    })

    const resolvedPeople: Record<string, string> = {}
    referencedPersonNames.forEach(name => {
        const person = people.find(p => p.name.toLowerCase() === name.toLowerCase())
        if (person) resolvedPeople[name] = person.name
    })

    const output = {
        ...note,
        _resolved: {
            ...(Object.keys(resolvedNotes).length > 0 && { notes: resolvedNotes }),
            ...(Object.keys(resolvedPeople).length > 0 && { people: resolvedPeople }),
        },
    }

    // Remove _resolved if empty
    if (Object.keys(output._resolved).length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _resolved, ...rest } = output
        return JSON.stringify(rest, null, 2)
    }

    return JSON.stringify(output, null, 2)
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

/**
 * Sanitize a note title for use as a filename.
 */
export function titleToFilename(title: string): string {
    return (title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)
}
