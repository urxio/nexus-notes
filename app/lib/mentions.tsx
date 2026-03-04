import type { Person } from "../types"
import { cn } from "@/lib/utils"

export function renderMentions(
  text: string,
  people: Person[],
  onNavigateTo?: (noteId: string) => void
): React.ReactNode {
  if (!text) return null
  const names = people.map(p => p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean)
  if (names.length === 0) return <>{text}</>
  const mentionRe = new RegExp(`@(${names.join('|')})`, 'gi')
  const segments: React.ReactNode[] = []
  let lastIndex = 0; let key = 0; let match: RegExpExecArray | null
  mentionRe.lastIndex = 0
  while ((match = mentionRe.exec(text)) !== null) {
    if (match.index > lastIndex)
      segments.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>)
    const capturedName = match[1]
    segments.push(
      <span
        key={key++}
        className={cn(
          "underline decoration-dotted underline-offset-2 font-medium text-foreground/90",
          onNavigateTo && "cursor-pointer hover:text-primary transition-colors"
        )}
        onClick={onNavigateTo ? (e) => {
          e.stopPropagation()
          const person = people.find(p => p.name.toLowerCase() === capturedName.toLowerCase())
          if (person?.noteId) onNavigateTo(person.noteId)
        } : undefined}
      >
        {capturedName}
      </span>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) segments.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  return segments.length > 0 ? <>{segments}</> : <>{text}</>
}
