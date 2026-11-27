/**
 * The risk engine itself lives in `supabase/functions/_shared/risk/` so the
 * edge function can bundle it at deploy time, which only walks the function's
 * own directory. This re-export keeps the application's import path stable.
 */
export * from '../../../supabase/functions/_shared/risk/index.ts'
