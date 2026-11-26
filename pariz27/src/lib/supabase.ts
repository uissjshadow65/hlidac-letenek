import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Konfigurace z proměnných prostředí (soubor .env.local nebo nastavení Vercelu).
 * Do kódu se nikdy nevkládají žádné klíče. Veřejný (anon / publishable) klíč
 * je určený pro prohlížeč – data chrání Row Level Security v databázi.
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined)?.trim()

export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'pariz27-auth',
      },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

export const PHOTO_BUCKET = 'note-photos'
