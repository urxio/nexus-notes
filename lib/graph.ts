import { Note, Person, GNode, GEdge } from "./types"

/**
 * Strip HTML tags and decode basic entities so the @mention regex works
 * correctly on contenteditable innerHTML (which may contain span wrappers,
 * bold/italic marks, etc.).
 */
function stripHtml(s: string): string {
    return s
        .replace(/<[^>]+>/g, ' ')   // remove all tags → replace with space
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

export function buildGraph(notes: Note[], people: Person[], w: number, h: number, existingNodes?: Map<string, GNode>): { nodes: GNode[]; edges: GEdge[] } {
    const nodes: GNode[] = []
    const edges: GEdge[] = []
    const tagSet = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)))
    const allTags = [...tagSet]
    const cx = w / 2, cy = h / 2
    notes.forEach((note, i) => {
        const id = `note:${note.id}`
        const existing = existingNodes?.get(id)
        const a = (i / Math.max(notes.length, 1)) * Math.PI * 2
        const r = Math.min(w, h) * 0.30
        nodes.push({
            id, type: 'note', label: note.title || 'Untitled',
            color: note.color, emoji: note.emoji,
            x: existing ? existing.x : cx + Math.cos(a) * r + (Math.random() - 0.5) * 60,
            y: existing ? existing.y : cy + Math.sin(a) * r + (Math.random() - 0.5) * 60,
            vx: existing ? existing.vx : 0, vy: existing ? existing.vy : 0, r: 65, noteId: note.id,
        })
    })
    allTags.forEach((tag, i) => {
        const id = `tag:${tag}`
        const existing = existingNodes?.get(id)
        const a = (i / Math.max(allTags.length, 1)) * Math.PI * 2
        const r = Math.min(w, h) * 0.12
        nodes.push({
            id, type: 'tag', label: tag, color: '#475569',
            x: existing ? existing.x : cx + Math.cos(a) * r + (Math.random() - 0.5) * 30,
            y: existing ? existing.y : cy + Math.sin(a) * r + (Math.random() - 0.5) * 30,
            vx: existing ? existing.vx : 0, vy: existing ? existing.vy : 0, r: 38,
        })
    })
    notes.forEach(note => note.tags.forEach(tag =>
        edges.push({ source: `note:${note.id}`, target: `tag:${tag}` })
    ))
    // Mention edges: connect notes that @mention a person to that person's note.
    // We check the raw HTML (data-mention attribute) AND the stripped plain text
    // so that multi-word names like "finish taxes" are matched correctly.
    // The old /@(\S+)/g regex stopped at the first space, so "@finish taxes"
    // would only capture "@finish" and miss the full name.
    const linkedPeople = people.filter(p => p.noteId)
    notes.forEach(note => {
        note.blocks.forEach(block => {
            const raw = (block.content + ' ' + (block.expandedContent ?? '')).toLowerCase()
            const plain = stripHtml(raw)
            linkedPeople.forEach(person => {
                if (person.noteId === note.id) return
                const name = person.name.toLowerCase()
                // Match either the HTML attribute form or the plain-text @name form
                const found =
                    raw.includes(`data-mention="${name}"`) ||   // injected HTML span
                    plain.includes(`@${name}`)                  // plain text / stripped HTML
                if (found) {
                    const src = `note:${note.id}`, tgt = `note:${person.noteId}`
                    if (!edges.some(e => e.source === src && e.target === tgt))
                        edges.push({ source: src, target: tgt })
                }
            })
        })
    })
    // Page mention edges: connect notes that embed another note via data-note-mention span
    notes.forEach(note => {
        note.blocks.forEach(block => {
            const content = (block.content ?? '') + ' ' + (block.expandedContent ?? '')
            const re = /data-note-mention="([a-zA-Z0-9_-]+)"/g
            let m: RegExpExecArray | null
            while ((m = re.exec(content)) !== null) {
                const targetId = m[1]
                if (targetId === note.id) continue
                const src = `note:${note.id}`, tgt = `note:${targetId}`
                if (!edges.some(e => e.source === src && e.target === tgt))
                    edges.push({ source: src, target: tgt })
            }
        })
    })

    return { nodes, edges }
}

export function tickSim(nodes: GNode[], edges: GEdge[], w: number, h: number, alpha: number) {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y
            const d = Math.sqrt(dx * dx + dy * dy) || 0.1
            const f = Math.min(12000 / (d * d), 80) * alpha
            const fx = (f * dx) / d, fy = (f * dy) / d
            nodes[i].vx -= fx; nodes[i].vy -= fy
            nodes[j].vx += fx; nodes[j].vy += fy
        }
    }
    const map = new Map(nodes.map(n => [n.id, n]))
    for (const { source, target } of edges) {
        const s = map.get(source), t = map.get(target)
        if (!s || !t) continue
        const dx = t.x - s.x, dy = t.y - s.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.1
        const f = (d - 160) * 0.045 * alpha
        const fx = (f * dx) / d, fy = (f * dy) / d
        s.vx += fx; s.vy += fy; t.vx -= fx; t.vy -= fy
    }
    for (const n of nodes) {
        n.vx += (w / 2 - n.x) * 0.004 * alpha
        n.vy += (h / 2 - n.y) * 0.004 * alpha
        n.vx *= 0.88; n.vy *= 0.88
        n.x = Math.max(n.r + 10, Math.min(w - n.r - 10, n.x + n.vx))
        n.y = Math.max(n.r + 10, Math.min(h - n.r - 10, n.y + n.vy))
    }
}
