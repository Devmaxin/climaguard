/**
 * Daily Climate Brief — Supabase Edge Function.
 *
 * SECURITY MODEL
 *   * The caller must present its own access token. It is forwarded to
 *     PostgREST unchanged, so every read is filtered by the existing RLS
 *     policies and a user can only ever read their own locations and
 *     preferences. Nothing the client sends is trusted: no user id, no city,
 *     no forecast value and no risk assessment is read from the body.
 *   * The service-role key is never used here. The privileged key stays in the
 *     ingestion job, where it belongs.
 *   * GROQ_API_KEY and GROQ_MODEL are read from the function's own secrets and
 *     never leave the server. If either is absent the function returns a
 *     deterministic brief instead of calling out.
 *   * Logs carry a status and a count only — never a token, a prompt, an email
 *     or a coordinate.
 *
 * The risk engine, snapshot assembly and all prompt/response handling live in
 * `brief-core.ts`, which is model- and runtime-independent and unit tested.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

import {
  assembleAssessment,
  generateBrief,
  hazardsFrom,
  type DailyBrief,
  type ForecastRow,
} from './brief-core.ts'
import { corsHeaders, resolveOrigin } from './cors.ts'
import type { CityKey } from '../../../src/lib/supabase/database.types.ts'

const FORECAST_SELECT =
  'variable, unit, value, valid_time, forecast_step, forecast_reference_time, fetched_at, source, source_licence'

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

Deno.serve(async (request: Request) => {
  const origin = resolveOrigin(Deno.env.get('APP_ORIGIN'), request.headers.get('origin'))

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, origin)
  }

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401, origin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    console.error('daily-brief: missing Supabase environment')
    return json({ error: 'not_configured' }, 503, origin)
  }

  // The caller's token travels with every query, so RLS — not this function —
  // decides what the request can see.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return json({ error: 'unauthorized' }, 401, origin)
  }

  const userId = userData.user.id

  const { data: location, error: locationError } = await supabase
    .from('monitored_locations')
    .select('city_key, is_primary')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (locationError) {
    console.error('daily-brief: location query failed', locationError.code)
    return json({ error: 'lookup_failed' }, 500, origin)
  }
  if (!location) {
    return json({ error: 'no_location' }, 404, origin)
  }

  // A user with no saved row keeps the documented default: every hazard is
  // reported. A query that *failed* is a different thing entirely and must not
  // be presented as "no preferences", so it is surfaced as an error.
  const { data: preferences, error: preferencesError } = await supabase
    .from('user_preferences')
    .select('hazard_interests')
    .eq('user_id', userId)
    .maybeSingle()

  if (preferencesError) {
    console.error('daily-brief: preferences query failed', preferencesError.code)
    return json({ error: 'preferences_unavailable' }, 500, origin)
  }

  const cityKey = location.city_key as CityKey

  const { data: rows, error: forecastError } = await supabase
    .from('climate_forecasts')
    .select(FORECAST_SELECT)
    .eq('city_key', cityKey)
    .order('forecast_reference_time', { ascending: false })
    .order('valid_time', { ascending: true })
    .limit(2000)

  if (forecastError) {
    console.error('daily-brief: forecast query failed', forecastError.code)
    return json({ error: 'forecast_unavailable' }, 500, origin)
  }

  const assessment = assembleAssessment(cityKey, (rows ?? []) as ForecastRow[], {
    hazards: hazardsFrom(preferences),
  })

  const brief: DailyBrief = await generateBrief({
    assessment,
    env: {
      apiKey: Deno.env.get('GROQ_API_KEY'),
      model: Deno.env.get('GROQ_MODEL'),
    },
  })

  console.log(
    JSON.stringify({
      event: 'daily_brief',
      status: assessment.status,
      source: brief.source,
      fallbackReason: brief.fallbackReason ?? null,
      rows: Array.isArray(rows) ? rows.length : 0,
    }),
  )

  return json({ brief, assessment }, 200, origin)
})
