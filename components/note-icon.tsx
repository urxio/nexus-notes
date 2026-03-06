import React from "react"
import { FUTURISTIC_ICONS } from "@/lib/constants"

export function NoteIcon({ iconName, className }: { iconName?: string, className?: string }) {
    if (!iconName) return null
    const IconComponent = FUTURISTIC_ICONS[iconName]
    if (IconComponent) return <IconComponent className={className} />
    return <span className={className}>{iconName}</span>
}
