import React from "react"
import { CheckCheck, Trash2, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InboxItem } from "@/lib/types"

interface InboxPanelProps {
    items: InboxItem[]
    activeId: string | null       // the currently open note in the editor
    onSelectItem: (item: InboxItem) => void
    onMarkAllRead: () => void
    onClearInbox: () => void
}

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60_000)    return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    if (diff < 604_800_000) return new Date(iso).toLocaleDateString('en', { weekday: 'short' })
    return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

const TYPE_ACCENT: Record<InboxItem['type'], string> = {
    task_due:          'text-orange-500 dark:text-orange-400',
    project_milestone: 'text-blue-500 dark:text-blue-400',
    person_stale:      'text-teal-500 dark:text-teal-400',
    meeting_upcoming:  'text-purple-500 dark:text-purple-400',
    followup_keyword:  'text-indigo-500 dark:text-indigo-400',
    catch_up:          'text-slate-400 dark:text-zinc-500',
}

const TYPE_DOT: Record<InboxItem['type'], string> = {
    task_due:          'bg-orange-400',
    project_milestone: 'bg-blue-400',
    person_stale:      'bg-teal-400',
    meeting_upcoming:  'bg-purple-400',
    followup_keyword:  'bg-indigo-400',
    catch_up:          'bg-slate-300 dark:bg-zinc-600',
}

export function InboxPanel({ items, activeId, onSelectItem, onMarkAllRead, onClearInbox }: InboxPanelProps) {
    const unread = items.filter(i => !i.read).length

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 border-b border-[#f3f4f6] dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-[15px] text-[#111827] dark:text-zinc-100 tracking-tight">Inbox</h2>
                        {unread > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                                {unread}
                            </span>
                        )}
                    </div>
                    {items.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {unread > 0 && (
                                <button onClick={onMarkAllRead} title="Mark all read"
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                                    <CheckCheck className="w-3 h-3" />
                                    All read
                                </button>
                            )}
                            <button onClick={onClearInbox} title="Clear inbox"
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-[#9ca3af] dark:text-zinc-600 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-red-400 dark:hover:text-red-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                                Clear
                            </button>
                        </div>
                    )}
                </div>
                <p className="text-[11px] text-[#9ca3af] dark:text-zinc-600 leading-relaxed">
                    Smart reminders from your notes
                </p>
            </div>

            {/* Items */}
            <ScrollArea className="flex-1 w-full">
                {items.length === 0 ? (
                    /* ── Empty state ── */
                    <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#f9fafb] dark:bg-zinc-800 flex items-center justify-center border border-[#e5e7eb] dark:border-zinc-700">
                            <Inbox className="w-6 h-6 text-[#d1d5db] dark:text-zinc-700" />
                        </div>
                        <div>
                            <p className="font-semibold text-[13px] text-[#374151] dark:text-zinc-400">Your notes are quiet right now ✨</p>
                            <p className="text-[11px] text-[#9ca3af] dark:text-zinc-600 mt-1 leading-relaxed">
                                Reminders appear here when tasks are due,<br />
                                meetings are coming up, or notes go stale.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="px-3 pt-3 pb-3 space-y-2">
                        {items.map(item => {
                            const isActive = item.noteId === activeId
                            const isUnread = !item.read
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onSelectItem(item)}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-xl transition-all cursor-pointer relative overflow-hidden",
                                        isActive
                                            ? "bg-white dark:bg-zinc-800 border-2 border-indigo-500 dark:border-indigo-500 shadow-[0_2px_12px_rgba(99,102,241,0.12)]"
                                            : isUnread
                                                ? "bg-white dark:bg-zinc-800/50 border border-indigo-200/70 dark:border-indigo-900/50 hover:border-[#c7d2fe] dark:hover:border-indigo-800 hover:shadow-sm hover:bg-[#fafaff] dark:hover:bg-zinc-800"
                                                : "bg-white dark:bg-zinc-800/50 border border-[#e5e7eb] dark:border-zinc-700/60 hover:border-[#c7d2fe] dark:hover:border-indigo-800 hover:shadow-sm hover:bg-[#fafaff] dark:hover:bg-zinc-800"
                                    )}
                                >
                                    {/* Unread accent bar */}
                                    {isUnread && !isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-indigo-500 dark:bg-indigo-400" />
                                    )}

                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        {/* Sender + type dot */}
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5", TYPE_DOT[item.type])} />
                                            <span className={cn(
                                                "text-[10px] font-mono uppercase tracking-[0.12em] truncate",
                                                TYPE_ACCENT[item.type]
                                            )}>
                                                {item.sender}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[9px] text-[#d1d5db] dark:text-zinc-600 flex-shrink-0 mt-0.5">
                                            {relativeTime(item.timestamp)}
                                        </span>
                                    </div>

                                    {/* Subject */}
                                    <p className={cn(
                                        "text-[13px] leading-snug mb-1 break-words overflow-hidden",
                                        isActive || isUnread
                                            ? "font-bold text-[#111827] dark:text-zinc-100"
                                            : "font-semibold text-[#374151] dark:text-zinc-300"
                                    )}>
                                        {item.subject}
                                    </p>

                                    {/* Preview */}
                                    {item.preview && (
                                        <p className="text-[11px] text-[#9ca3af] dark:text-zinc-600 line-clamp-2 leading-relaxed">
                                            {item.preview}
                                        </p>
                                    )}

                                    {/* Unread dot */}
                                    {isUnread && !isActive && (
                                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
