import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Returns the shared browser-side Supabase client (singleton).
 * Safe to call multiple times — always returns the same instance.
 */
export function getSupabaseClient(): SupabaseClient {
    if (!_client) {
        _client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return _client
}
