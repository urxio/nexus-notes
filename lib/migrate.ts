import type { SupabaseClient } from '@supabase/supabase-js'
import {
    loadNotes, loadPeople, loadFolders,
    loadObjectTypes, loadDeletedObjectTypes, loadInbox,
    noteToDb, personToDb, folderToDb, objectTypeToDb, inboxItemToDb,
} from './storage'

const MIGRATION_KEY = 'locus-cloud-migrated-v1'

/**
 * One-time migration: copies all localStorage data into Supabase on first login.
 *
 * Safe to call on every boot — it checks `MIGRATION_KEY` first and skips
 * if the migration has already run, or if the user already has cloud data.
 */
export async function migrateIfNeeded(
    supabase: SupabaseClient,
    userId: string
): Promise<{ migrated: boolean }> {
    if (typeof window === 'undefined') return { migrated: false }
    if (localStorage.getItem(MIGRATION_KEY) === '1') return { migrated: false }

    try {
        // If the user already has notes in Supabase, skip migration (e.g. second device)
        const { count } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        if (count && count > 0) {
            localStorage.setItem(MIGRATION_KEY, '1')
            return { migrated: false }
        }

        const notes = loadNotes()

        // Nothing to migrate
        if (notes.length === 0) {
            localStorage.setItem(MIGRATION_KEY, '1')
            return { migrated: false }
        }

        const people        = loadPeople()
        const folders       = loadFolders()
        const objectTypes   = loadObjectTypes()
        const deletedTypes  = loadDeletedObjectTypes()
        const inbox         = loadInbox()

        // Build the ops array without boolean short-circuits so we can inspect errors properly
        const ops: Promise<{ error: any } | null>[] = [
            supabase.from('notes').upsert(notes.map(n => noteToDb(n, userId)), { onConflict: 'id' }) as any,
        ]
        if (people.length > 0)
            ops.push(supabase.from('people').upsert(people.map(p => personToDb(p, userId)), { onConflict: 'id' }) as any)
        if (folders.length > 0)
            ops.push(supabase.from('folders').upsert(folders.map(f => folderToDb(f, userId)), { onConflict: 'id' }) as any)
        if (objectTypes.length > 0)
            ops.push(supabase.from('object_types').upsert(objectTypes.map(t => objectTypeToDb(t, userId)), { onConflict: 'id' }) as any)
        if (deletedTypes.length > 0)
            ops.push(supabase.from('deleted_object_types').upsert(deletedTypes.map(typeId => ({ user_id: userId, type_id: typeId }))) as any)
        if (inbox.length > 0)
            ops.push(supabase.from('inbox').upsert(inbox.map(i => inboxItemToDb(i, userId)), { onConflict: 'id' }) as any)

        // Run in parallel; use allSettled so a single failure doesn't abort everything
        const results = await Promise.allSettled(ops)

        // Only mark as done if no upsert returned an error — allows retry on next boot if something failed
        const hasError = results.some(r =>
            r.status === 'rejected' ||
            (r.status === 'fulfilled' && r.value && (r.value as any).error)
        )
        if (hasError) {
            console.warn('[locus] Migration had errors — will retry on next boot')
            return { migrated: false }
        }

        localStorage.setItem(MIGRATION_KEY, '1')
        console.log(`[locus] Migrated ${notes.length} notes from localStorage to Supabase ✓`)
        return { migrated: true }
    } catch (err) {
        console.warn('[locus] Migration skipped due to error:', err)
        return { migrated: false }
    }
}
