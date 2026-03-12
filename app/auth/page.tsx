'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'

type Mode = 'signin' | 'signup' | 'magic'

export default function AuthPage() {
    const router = useRouter()
    const [mode, setMode] = useState<Mode>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setLoading(true)

        const supabase = getSupabaseClient()

        try {
            if (mode === 'magic') {
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: `${window.location.origin}/app` },
                })
                if (error) throw error
                setSuccess('Magic link sent! Check your email inbox.')
            } else if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                router.push('/app')
                router.refresh()
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: `${window.location.origin}/app` },
                })
                if (error) throw error
                setSuccess('Account created! Check your email to confirm, then sign in.')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#07070f] text-zinc-100 flex items-center justify-center p-4">
            {/* Background glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full blur-[140px]"
                    style={{ background: 'rgba(99,102,241,0.20)' }}
                />
                <div
                    className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[130px]"
                    style={{ background: 'rgba(139,92,246,0.14)' }}
                />
                <div
                    className="absolute top-[40%] left-[30%] w-[35%] h-[30%] rounded-full blur-[100px]"
                    style={{ background: 'rgba(59,130,246,0.08)' }}
                />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {/* Logo + wordmark */}
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <img src="/logo.svg" alt="Locus" className="w-10 h-10 rounded-xl shadow-sm" />
                    <div>
                        <p className="font-bold text-lg tracking-tight leading-none">Locus Notes</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Your second brain in the cloud</p>
                    </div>
                </div>

                {/* Glass card */}
                <div
                    className="rounded-2xl border border-white/[0.08] p-8"
                    style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}
                >
                    {/* Mode tabs */}
                    <div className="flex gap-1 p-1 rounded-xl mb-6 bg-white/[0.05]">
                        {(['signin', 'signup', 'magic'] as Mode[]).map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    mode === m
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Sign Up' : '✨ Magic Link'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all"
                            />
                        </div>

                        {/* Password — hidden for magic link mode */}
                        {mode !== 'magic' && (
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    minLength={6}
                                    className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.08] transition-all"
                                />
                                {mode === 'signup' && (
                                    <p className="text-zinc-600 text-xs mt-1.5">Must be at least 6 characters</p>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
                                {success}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading && (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {mode === 'signin'
                                ? 'Sign In to Locus'
                                : mode === 'signup'
                                    ? 'Create Account'
                                    : 'Send Magic Link'}
                        </button>
                    </form>
                </div>

                {/* Footer links */}
                <div className="flex items-center justify-between mt-5 px-1">
                    <Link href="/" className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
                        ← Back to home
                    </Link>
                    <p className="text-zinc-700 text-xs">
                        {mode === 'signin' ? (
                            <button
                                type="button"
                                onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
                                className="hover:text-zinc-500 transition-colors"
                            >
                                No account? Sign up →
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setMode('signin'); setError(null); setSuccess(null) }}
                                className="hover:text-zinc-500 transition-colors"
                            >
                                Have an account? Sign in →
                            </button>
                        )}
                    </p>
                </div>
            </div>
        </div>
    )
}
