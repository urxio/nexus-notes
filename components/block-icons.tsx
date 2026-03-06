import React from "react"
import { Heading1, Heading2, Heading3, AlignLeft, List, ListOrdered, Quote, Code2, Minus, CheckSquare, Calendar, ChevronRight } from "lucide-react"
import { BlockType } from "@/lib/types"

export const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
    h1: <Heading1 className="w-3.5 h-3.5" />,
    h2: <Heading2 className="w-3.5 h-3.5" />,
    h3: <Heading3 className="w-3.5 h-3.5" />,
    p: <AlignLeft className="w-3.5 h-3.5" />,
    bullet: <List className="w-3.5 h-3.5" />,
    numbered: <ListOrdered className="w-3.5 h-3.5" />,
    quote: <Quote className="w-3.5 h-3.5" />,
    code: <Code2 className="w-3.5 h-3.5" />,
    divider: <Minus className="w-3.5 h-3.5" />,
    todo: <CheckSquare className="w-3.5 h-3.5" />,
    date: <Calendar className="w-3.5 h-3.5" />,
    toggle: <ChevronRight className="w-3.5 h-3.5" />,
    table: <List className="w-3.5 h-3.5" />,
}
