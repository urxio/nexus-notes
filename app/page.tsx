'use client'

import { ArrowRight, BrainCircuit, Network, Zap, Github, ChevronRight, FileText, Hash, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      alert("To install Locus Notes, click your browser's 'Share' or 'Menu' button and select 'Add to Home Screen' or 'Install App'.")
      return;
    }
    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    // We no longer need the prompt. Clear it up.
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-orange-500/30 font-sans overflow-x-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] rounded-full bg-orange-500/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-orange-900/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
      </div>

      {/* Navigation */}
      <header className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b",
        scrolled
          ? "bg-zinc-950/80 backdrop-blur-md border-zinc-800/50 py-3"
          : "bg-transparent border-transparent py-5"
      )}>
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Locus Logo" className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-semibold text-lg tracking-tight">Locus Notes</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="https://github.com/urxio/locus-notes" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:flex items-center gap-2 text-sm font-medium">
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <button
              onClick={handleInstallClick}
              className="text-zinc-300 hover:text-white transition-colors text-sm font-medium hidden sm:block"
            >
              Install App
            </button>
            <Link href="/app" className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-orange-600/20 flex items-center gap-2 group border border-orange-500/50 shrink-0">
              <span>Open App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-6 md:px-12 pt-20 pb-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-orange-400 text-xs font-medium mb-8 backdrop-blur-sm">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>The future of networked thought</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
            Connect your thoughts.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
              Build your graph.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
            A beautiful, minimalist block editor with an Obsidian-style tag network graph.
            Organize chaotic ideas into structured knowledge effortlessly.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/app" className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3.5 rounded-full text-base font-medium transition-all shadow-xl shadow-orange-600/20 flex items-center gap-2 group w-full sm:w-auto justify-center border border-orange-500/50">
              <span>Start Writing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Detailed App Preview Mockup */}
          <div className="mt-24 w-full max-w-5xl relative rounded-2xl overflow-hidden shadow-2xl shadow-orange-900/20 border border-zinc-800/80 bg-zinc-950 flex flex-col md:flex-row group">
            {/* Editor Side */}
            <div className="flex-1 p-6 md:p-10 border-b md:border-b-0 md:border-r border-zinc-800/80 relative overflow-hidden bg-zinc-950/50">
              <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />

              {/* Fake Mac Header */}
              <div className="flex items-center gap-2 mb-8 opacity-50">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>

              {/* Fake Editor Content */}
              <div className="space-y-6 transform group-hover:translate-x-1 transition-transform duration-500 ease-out relative z-10 w-full max-w-md">
                <div className="h-8 w-[80%] bg-zinc-800/80 rounded-lg" />
                <div className="flex gap-2">
                  <div className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 text-xs font-mono flex items-center gap-1.5"><Hash className="w-3 h-3" />research</div>
                  <div className="px-3 py-1 bg-zinc-900 text-zinc-400 rounded-full border border-zinc-800 text-xs font-mono flex items-center gap-1.5"><Hash className="w-3 h-3" />knowledge-graph</div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="h-3 w-full bg-zinc-800/60 rounded" />
                  <div className="h-3 w-[95%] bg-zinc-800/60 rounded" />
                  <div className="h-3 w-[85%] bg-zinc-800/60 rounded" />
                  <div className="h-3 w-[60%] bg-zinc-800/60 rounded" />
                </div>

                <div className="py-4 border-l-2 border-orange-500/50 pl-4 space-y-3 my-4 bg-gradient-to-r from-orange-500/5 to-transparent">
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
            <div className="flex-1 relative overflow-hidden bg-[#0a0a0a] min-h-[400px] flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,88,12,0.15)_0%,transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

              {/* Background grid */}
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

              <div className="relative w-full h-full max-w-sm max-h-[300px] origin-center group-hover:scale-105 transition-transform duration-1000 ease-out">
                {/* SVG Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ stroke: 'currentColor', strokeWidth: 1.5 }}>
                  <line x1="50%" y1="50%" x2="20%" y2="25%" className="text-zinc-800" />
                  <line x1="50%" y1="50%" x2="80%" y2="30%" className="text-orange-900/60" />
                  <line x1="50%" y1="50%" x2="75%" y2="75%" className="text-zinc-800" />
                  <line x1="50%" y1="50%" x2="25%" y2="70%" className="text-orange-900/40" />

                  <line x1="80%" y1="30%" x2="75%" y2="75%" className="text-zinc-800/50" />
                  <line x1="20%" y1="25%" x2="25%" y2="70%" className="text-zinc-800/50" />

                  <line x1="80%" y1="30%" x2="90%" y2="15%" className="text-zinc-800/30" />
                  <line x1="25%" y1="70%" x2="15%" y2="85%" className="text-zinc-800/30" />
                </svg>

                {/* Nodes */}
                {/* Center Node */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 z-20 group-hover:shadow-orange-500/40 transition-shadow duration-500">
                  <Network className="w-8 h-8 text-white" />
                  <div className="absolute -inset-2 rounded-full border border-orange-500/30 shrink-0 w-20 h-20 animate-[spin_10s_linear_infinite]" />
                </div>

                {/* Satellite 1 */}
                <div className="absolute left-[20%] top-[25%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-10 h-10 bg-zinc-900 border border-zinc-700/80 rounded-xl flex items-center justify-center shadow-lg group-hover:-translate-y-1 transition-transform duration-500 delay-100">
                    <FileText className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>

                {/* Satellite 2 */}
                <div className="absolute left-[80%] top-[30%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-12 h-12 bg-zinc-900 border border-orange-500/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.15)] group-hover:scale-110 transition-transform duration-500 delay-200">
                    <Hash className="w-5 h-5 text-orange-400" />
                  </div>
                </div>

                {/* Satellite 3 */}
                <div className="absolute left-[75%] top-[75%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center shadow-lg group-hover:translate-x-1 transition-transform duration-500 delay-300">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>

                {/* Satellite 4 */}
                <div className="absolute left-[25%] top-[70%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-lg group-hover:-translate-x-1 transition-transform duration-500 cursor-default">
                    <span className="text-[10px] font-mono text-zinc-400">Concept</span>
                  </div>
                </div>

                {/* Tiny deco nodes */}
                <div className="absolute left-[90%] top-[15%] w-2 h-2 bg-zinc-700 rounded-full" />
                <div className="absolute left-[15%] top-[85%] w-2 h-2 bg-zinc-700 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 md:px-12 py-24">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<BrainCircuit className="w-6 h-6 text-orange-500" />}
              title="Block-based Editor"
              desc="Write fluidly with a modern block editor. Type '/' for commands, markdown support included."
            />
            <FeatureCard
              icon={<Network className="w-6 h-6 text-orange-500" />}
              title="Tag Graph Network"
              desc="Visualize connections between your thoughts instantly. Tags act as bridge-nodes linking related concepts."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-orange-500" />}
              title="Instant Offline Sync"
              desc="Everything lives directly within your browser's local storage. Extremely fast, private, and always available."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950">
        <div className="container mx-auto px-6 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-5 h-5 rounded grayscale opacity-50" />
            <span className="text-zinc-500 text-sm">Locus Notes &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/urxio/locus-notes" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">GitHub Code</a>
            <Link href="/app" className="text-zinc-500 hover:text-orange-400 font-medium text-sm transition-colors">Enter Workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-8 hover:bg-zinc-900/80 transition-colors group">
      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-zinc-100">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  )
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}
