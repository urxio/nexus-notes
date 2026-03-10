import type React from "react"
import "@/app/globals.css"
import { DM_Sans, JetBrains_Mono } from "next/font/google"
import { EnhancedThemeProvider } from "@/components/enhanced-theme-provider"
import { Toaster } from "sonner"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
})

export const metadata = {
  title: "Locus Notes",
  description: "A block editor with an Obsidian-style tag network graph",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} ${dmSans.className}`}>
        <EnhancedThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="locus-notes-theme"
        >
          {children}
          <Toaster position="bottom-center" richColors />
        </EnhancedThemeProvider>
      </body>
    </html>
  )
}
