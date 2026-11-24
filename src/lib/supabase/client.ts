import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Accounts are optional in this build. Unless both variables are present the
 * rest of the application keeps working and only account screens report the
 * missing setup — a build with no credentials must never crash.
 *
 * Both values are public by design: Row Level Security decides what a caller
 * can read or write, never the key itself. The service-role key must never
 * appear in frontend code, which is why only these two variables are read.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // The landing page navigates with hash anchors, so URL detection stays
          // off until an email-link flow actually exists.
          detectSessionInUrl: false,
          storageKey: 'cg-auth',
        },
      })
    : null

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.',
    )
    this.name = 'SupabaseNotConfiguredError'
  }
}

export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new SupabaseNotConfiguredError()
  }

  return supabase
}
