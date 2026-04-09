import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh the session — if Supabase is unreachable, fall back to no user so
    // the app can still serve offline/local-mode requests. Errors are logged so
    // outages don't silently bypass auth for non-local-mode users.
    const { data: { user }, error: authError } = await supabase.auth
        .getUser()
        .catch((err: unknown) => {
            console.error('[middleware] Supabase auth network error:', err instanceof Error ? err.message : err)
            return { data: { user: null }, error: err }
        })

    if (authError) {
        console.warn('[middleware] Auth check returned an error — applying offline fallback:', authError)
    }

    const { pathname } = request.nextUrl

    // Redirect unauthenticated visitors trying to access the app,
    // unless they opted into local-only mode (cookie set on auth page)
    if (!user && pathname.startsWith('/app')) {
        const localMode = request.cookies.get('locus-local-mode')?.value
        if (localMode !== '1') {
            const url = request.nextUrl.clone()
            url.pathname = '/auth'
            return NextResponse.redirect(url)
        }
    }

    // Redirect already-authenticated visitors away from the auth page
    if (user && pathname === '/auth') {
        const url = request.nextUrl.clone()
        url.pathname = '/app'
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: ['/app/:path*', '/auth'],
}
