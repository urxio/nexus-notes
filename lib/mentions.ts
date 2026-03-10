import { Person } from "./types"

/**
 * Wraps bare http/https URLs in <a> tags for clickable hyperlinks.
 * Skips text that is already inside an existing <a> tag.
 */
export function linkifyUrls(html: string): string {
    if (!html) return ''
    const re = /(<a[\s>][\s\S]*?<\/a>|<[^>]*>)|(https?:\/\/[^\s<>"']+)/gi
    return html.replace(re, (_, tag, url) => {
        if (tag) return tag
        // Strip trailing punctuation that ends sentences but isn't part of the URL
        const trailing = url.match(/[.,;:!?)\]>'"]+$/)?.[0] ?? ''
        const clean = trailing ? url.slice(0, -trailing.length) : url
        return `<a href="${clean}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline hover:text-blue-600 transition-colors">${clean}</a>${trailing}`
    })
}

/** Formats an ISO date string (YYYY-MM-DD) into a human-readable display label. */
export function formatInlineDate(isoDate: string): string {
    try {
        return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
    } catch { return isoDate }
}

/**
 * Creates an atomic, non-editable inline date chip span for embedding inside
 * contenteditable HTML.  The span has:
 *   • contenteditable="false"  — treated as one character by the editor
 *   • data-type="date"         — used by click handlers to open the picker
 *   • data-date="YYYY-MM-DD"   — machine-readable value
 *   • data-dateid="<uid>"      — unique id used to update the right span later
 *   • class="inline-date-chip" — visual styling (see globals.css)
 */
export function createInlineDateHtml(isoDate: string): string {
    const id = Math.random().toString(36).slice(2, 9)
    return `<span contenteditable="false" data-type="date" data-date="${isoDate}" data-dateid="${id}" class="inline-date-chip">${formatInlineDate(isoDate)}</span>`
}

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
