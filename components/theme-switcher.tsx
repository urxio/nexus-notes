"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import { LightModeIcon, DarkModeIcon } from "@/components/theme-icons"
import { Terminal, Check, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

const THEMES = [
  {
    key: "light",
    label: "Light",
    desc: "Clean & bright",
    Icon: LightModeIcon,
  },
  {
    key: "dark",
    label: "Dark",
    desc: "Easy on the eyes",
    Icon: DarkModeIcon,
  },
  {
    key: "terminal",
    label: "Terminal",
    desc: "Monospace noir",
    Icon: Terminal,
  },
] as const

export function ThemeSwitcher({ side = "up" }: { side?: "up" | "right" }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", handler)
    return () => window.removeEventListener("mousedown", handler)
  }, [open])

  if (!mounted) {
    return <div className="h-7 w-7 rounded-lg bg-muted animate-pulse" />
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Change appearance"
        className={cn(
          "w-7 h-7 rounded-xl flex items-center justify-center transition-all",
          open
            ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
            : "text-[#9ca3af] dark:text-zinc-600 hover:text-[#374151] dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
        )}
      >
        <Palette className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          "absolute w-44 rounded-xl border border-[#e5e7eb] dark:border-zinc-700/60 bg-white dark:bg-zinc-900 shadow-xl z-50 py-1.5 overflow-hidden",
          side === "right"
            ? "left-full bottom-0 ml-2"
            : "bottom-full left-0 mb-2"
        )}>
          <p className="px-3 pb-1.5 pt-0.5 font-mono text-[9px] uppercase tracking-widest text-[#d1d5db] dark:text-zinc-600">
            Appearance
          </p>
          {THEMES.map(({ key, label, desc, Icon }) => {
            const active = theme === key
            return (
              <button
                key={key}
                onClick={() => { setTheme(key); setOpen(false) }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : "hover:bg-slate-50 dark:hover:bg-zinc-800"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active ? "text-indigo-500 dark:text-indigo-400" : "text-[#9ca3af] dark:text-zinc-600")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[12px] font-medium leading-none", active ? "text-indigo-700 dark:text-indigo-300" : "text-[#374151] dark:text-zinc-300")}>{label}</p>
                  <p className="text-[10px] text-[#9ca3af] dark:text-zinc-600 mt-0.5">{desc}</p>
                </div>
                {active && <Check className="w-3 h-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
