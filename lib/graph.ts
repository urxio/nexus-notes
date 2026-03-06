import { Note, Person, GNode, GEdge } from "./types"

export function buildGraph(notes: Note[], people: Person[], w: number, h: number): { nodes: GNode[]; edges: GEdge[] } {
    const nodes: GNode[] = []
    const edges: GEdge[] = []
    const tagSet = new Set<string>()
    notes.forEach(n => n.tags.forEach(t => tagSet.add(t)))
    const allTags = [...tagSet]
    const cx = w / 2, cy = h / 2
    notes.forEach((note, i) => {
        const a = (i / Math.max(notes.length, 1)) * Math.PI * 2
        const r = Math.min(w, h) * 0.30
        nodes.push({
            id: `note:${note.id}`, type: 'note', label: note.title || 'Untitled',
            color: note.color, emoji: note.emoji,
            x: cx + Math.cos(a) * r + (Math.random() - 0.5) * 60,
            y: cy + Math.sin(a) * r + (Math.random() - 0.5) * 60,
            vx: 0, vy: 0, r: 65, noteId: note.id,
        })
    })
    allTags.forEach((tag, i) => {
        const a = (i / Math.max(allTags.length, 1)) * Math.PI * 2
        const r = Math.min(w, h) * 0.12
        nodes.push({
            id: `tag:${tag}`, type: 'tag', label: tag, color: '#475569',
            x: cx + Math.cos(a) * r + (Math.random() - 0.5) * 30,
            y: cy + Math.sin(a) * r + (Math.random() - 0.5) * 30,
            vx: 0, vy: 0, r: 38,
        })
    })
    notes.forEach(note => note.tags.forEach(tag =>
        edges.push({ source: `note:${note.id}`, target: `tag:${tag}` })
    ))
    // Mention edges: connect notes that @mention a person to that person's note
    const personNoteMap = new Map(
        people.filter(p => p.noteId).map(p => [p.name.toLowerCase(), p.noteId!])
    )
    notes.forEach(note => {
        note.blocks.forEach(block => {
            const matches = (block.content + ' ' + (block.expandedContent ?? '')).match(/@(\S+)/g)
            if (!matches) return
            matches.forEach(m => {
                const name = m.slice(1).toLowerCase()
                const personNoteId = personNoteMap.get(name)
                if (personNoteId && personNoteId !== note.id &&
                    !edges.some(e => e.source === `note:${note.id}` && e.target === `note:${personNoteId}`)) {
                    edges.push({ source: `note:${note.id}`, target: `note:${personNoteId}` })
                }
            })
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
        n.vx *= 0.82; n.vy *= 0.82
        n.x = Math.max(n.r + 10, Math.min(w - n.r - 10, n.x + n.vx))
        n.y = Math.max(n.r + 10, Math.min(h - n.r - 10, n.y + n.vy))
    }
}
