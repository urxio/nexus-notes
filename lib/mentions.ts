import { Person } from "./types"

export function injectMentionsIntoHtml(html: string, people: Person[]): string {
    if (!html) return ''
    const names = people.map(p => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean)
    if (names.length === 0) return html
    const mentionRe = new RegExp(`(<[^>]*>)|(@(?:${names.join('|')}))`, 'gi')
    return html.replace(mentionRe, (match, tag, name) => {
        if (tag) return match
        return `<span data-mention="${name.slice(1)}" class="underline decoration-dotted underline-offset-2 font-medium text-foreground/90 cursor-pointer hover:text-primary transition-colors">${match}</span>`
    })
}
