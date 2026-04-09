'use client'

import { ArrowRight, BrainCircuit, Network, Zap, FileText, Hash, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const DISCORD_URL = 'https://discord.gg/5vWNJkTn'

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.102.128 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07070f] text-zinc-100 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-8%] left-[-8%]  w-[45%] h-[45%] rounded-full blur-[140px]"
          style={{ background: 'rgba(99,102,241,0.22)' }} />
        <div className="absolute top-[15%]  right-[-6%] w-[35%] h-[55%] rounded-full blur-[120px]"
          style={{ background: 'rgba(139,92,246,0.14)' }} />
        <div className="absolute bottom-[-8%] left-[18%]  w-[55%] h-[40%] rounded-full blur-[140px]"
          style={{ background: 'rgba(99,102,241,0.16)' }} />
        <div className="absolute top-[45%]  left-[35%]  w-[30%] h-[35%] rounded-full blur-[100px]"
          style={{ background: 'rgba(59,130,246,0.09)' }} />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
      </div>

      {/* ── Navigation ───────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.07] py-4"
        style={{ background: 'rgba(7,7,15,0.55)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}
      >
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Locus Logo" width={32} height={32} className="rounded-lg shadow-sm" />
            <span className="font-semibold text-lg tracking-tight">Locus Notes</span>
          </div>
          <Link
            href="/app"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 group border border-indigo-500/50"
          >
            <span>Open App</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="container mx-auto px-6 md:px-12 pt-20 pb-32 flex flex-col items-center text-center">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
            {/* Beta badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-300 text-xs font-medium backdrop-blur-sm"
              style={{ background: 'rgba(245,158,11,0.08)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Currently in Beta</span>
            </div>
            {/* Discord community nudge */}
            <Link
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 hover:border-indigo-400/40 text-xs font-medium backdrop-blur-sm transition-colors"
              style={{ background: 'rgba(99,102,241,0.08)' }}
            >
              <DiscordIcon className="w-3.5 h-3.5" />
              <span>Join the community</span>
            </Link>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
            Connect your thoughts.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500">
              Build your graph.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
            A beautiful, minimalist block editor with an Obsidian-style tag network graph.
            Organize chaotic ideas into structured knowledge effortlessly.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/app"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-full text-base font-medium transition-all shadow-xl shadow-indigo-600/25 flex items-center gap-2 group w-full sm:w-auto justify-center border border-indigo-500/50"
            >
              <span>Start Writing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full text-base font-medium transition-all w-full sm:w-auto justify-center border border-white/10 hover:border-indigo-500/40 text-zinc-300 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <DiscordIcon className="w-5 h-5 text-indigo-400" />
              <span>Join Discord</span>
            </Link>
          </div>

          {/* Beta feedback note */}
          <p className="mt-6 text-zinc-600 text-xs max-w-sm text-center leading-relaxed">
            Locus is in early beta — things may change. Share feedback and help shape what it becomes.
          </p>

          {/* ── App Preview Mockup ─────────────────────────────────── */}
          <div
            className="mt-24 w-full max-w-5xl relative rounded-2xl overflow-hidden border border-white/[0.10] shadow-2xl shadow-indigo-900/20 flex flex-col md:flex-row group"
            style={{ background: 'rgba(10,10,18,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          >
            {/* Editor Side */}
            <div className="flex-1 p-6 md:p-10 border-b md:border-b-0 md:border-r border-white/[0.07] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ background: 'rgba(99,102,241,0.07)' }} />

              {/* Fake Mac chrome */}
              <div className="flex items-center gap-2 mb-8 opacity-50">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>

              {/* Fake Editor Content */}
              <div className="space-y-6 transform group-hover:translate-x-1 transition-transform duration-500 ease-out relative z-10 w-full max-w-md">
                <div className="h-8 w-[80%] bg-zinc-800/80 rounded-lg" />
                <div className="flex gap-2">
                  <div className="px-3 py-1 text-indigo-300 rounded-full text-xs font-mono flex items-center gap-1.5 border border-indigo-500/30"
                    style={{ background: 'rgba(99,102,241,0.12)' }}>
                    <Hash className="w-3 h-3" />research
                  </div>
                  <div className="px-3 py-1 bg-white/[0.04] text-zinc-400 rounded-full border border-white/[0.08] text-xs font-mono flex items-center gap-1.5">
                    <Hash className="w-3 h-3" />knowledge-graph
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="h-3 w-full bg-zinc-800/60 rounded" />
                  <div className="h-3 w-[95%] bg-zinc-800/60 rounded" />
                  <div className="h-3 w-[85%] bg-zinc-800/60 rounded" />
                  <div className="h-3 w-[60%] bg-zinc-800/60 rounded" />
                </div>
                <div className="py-4 border-l-2 border-indigo-500/50 pl-4 space-y-3 my-4"
                  style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.06), transparent)' }}>
                  <div className="h-3 w-[90%] bg-zinc-700/80 rounded" />
                  <div className="h-3 w-[75%] bg-zinc-700/80 rounded" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px]">📝</div>
                    <div className="h-3 w-1/3 bg-zinc-800/80 rounded" />
                  </div>
                  <div className="h-3 w-[80%] bg-zinc-800/60 rounded ml-9" />
                  <div className="h-3 w-[65%] bg-zinc-800/60 rounded ml-9" />
                </div>
              </div>
            </div>

            {/* Graph Side */}
            <div className="flex-1 relative overflow-hidden bg-[#06060e] min-h-[400px] flex items-center justify-center">
              <div className="absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.20) 0%, transparent 70%)' }} />
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

              <div className="relative w-full h-full max-w-sm max-h-[300px] origin-center group-hover:scale-105 transition-transform duration-1000 ease-out">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ strokeWidth: 1.5 }}>
                  <line x1="50%" y1="50%" x2="20%" y2="25%" stroke="rgba(99,102,241,0.25)" />
                  <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="rgba(139,92,246,0.40)" />
                  <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="rgba(99,102,241,0.25)" />
                  <line x1="50%" y1="50%" x2="25%" y2="70%" stroke="rgba(139,92,246,0.30)" />
                  <line x1="80%" y1="30%" x2="75%" y2="75%" stroke="rgba(99,102,241,0.18)" />
                  <line x1="20%" y1="25%" x2="25%" y2="70%" stroke="rgba(99,102,241,0.18)" />
                  <line x1="80%" y1="30%" x2="90%" y2="15%" stroke="rgba(99,102,241,0.12)" />
                  <line x1="25%" y1="70%" x2="15%" y2="85%" stroke="rgba(99,102,241,0.12)" />
                </svg>
                {/* Center Node */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl flex items-center justify-center z-20 transition-shadow duration-500"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
                  <Network className="w-8 h-8 text-white" />
                  <div className="absolute -inset-2 rounded-full shrink-0 w-20 h-20 animate-[spin_10s_linear_infinite]"
                    style={{ border: '1px solid rgba(99,102,241,0.35)' }} />
                </div>
                {/* Satellites */}
                <div className="absolute left-[20%] top-[25%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-10 h-10 bg-zinc-900 border border-zinc-700/80 rounded-xl flex items-center justify-center shadow-lg group-hover:-translate-y-1 transition-transform duration-500 delay-100">
                    <FileText className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
                <div className="absolute left-[80%] top-[30%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 delay-200"
                    style={{ border: '1px solid rgba(99,102,241,0.40)', boxShadow: '0 0 15px rgba(99,102,241,0.20)' }}>
                    <Hash className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <div className="absolute left-[75%] top-[75%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center shadow-lg group-hover:translate-x-1 transition-transform duration-500 delay-300">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>
                <div className="absolute left-[25%] top-[70%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-lg group-hover:-translate-x-1 transition-transform duration-500 cursor-default">
                    <span className="text-[10px] font-mono text-zinc-400">Concept</span>
                  </div>
                </div>
                <div className="absolute left-[90%] top-[15%] w-2 h-2 rounded-full" style={{ background: 'rgba(99,102,241,0.50)' }} />
                <div className="absolute left-[15%] top-[85%] w-2 h-2 rounded-full" style={{ background: 'rgba(139,92,246,0.40)' }} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────── */}
        <section className="container mx-auto px-6 md:px-12 py-24">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <GlassFeatureCard
              icon={<BrainCircuit className="w-6 h-6 text-indigo-400" />}
              title="Block-based Editor"
              desc="Write fluidly with a modern block editor. Type '/' for commands, markdown support included."
            />
            <GlassFeatureCard
              icon={<Network className="w-6 h-6 text-indigo-400" />}
              title="Tag Graph Network"
              desc="Visualize connections between your thoughts instantly. Tags act as bridge-nodes linking related concepts."
            />
            <GlassFeatureCard
              icon={<Zap className="w-6 h-6 text-indigo-400" />}
              title="Instant Offline Sync"
              desc="Everything lives directly within your browser's local storage. Extremely fast, private, and always available."
            />
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        className="border-t border-white/[0.07]"
        style={{ background: 'rgba(7,7,15,0.60)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="container mx-auto px-6 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Logo" width={20} height={20} className="rounded grayscale opacity-50" />
            <span className="text-zinc-500 text-sm">Locus Notes &copy; {new Date().getFullYear()}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-amber-400/70 border border-amber-500/20 ml-1"
              style={{ background: 'rgba(245,158,11,0.06)' }}>
              BETA
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 text-sm transition-colors"
            >
              <DiscordIcon className="w-4 h-4" />
              <span>Discord Community</span>
            </Link>
            <Link href="/app" className="text-zinc-500 hover:text-indigo-400 font-medium text-sm transition-colors">
              Enter Workspace →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function GlassFeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="relative group overflow-hidden rounded-2xl p-8 border border-white/[0.07] hover:border-indigo-500/30 transition-all duration-300"
      style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      {/* Subtle inner glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(99,102,241,0.06), transparent 60%)' }} />
      <div className="relative z-10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 border border-indigo-500/20"
          style={{ background: 'rgba(99,102,241,0.10)' }}
        >
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-3 text-zinc-100">{title}</h3>
        <p className="text-zinc-400 leading-relaxed text-sm">{desc}</p>
      </div>
    </div>
  )
}

