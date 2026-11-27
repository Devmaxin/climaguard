import { requireSupabase } from '@/lib/supabase/client'
import {
  parseBriefEnvelope,
  type DailyBriefResponse,
} from '@/lib/brief/brief-contract'

/**
 * Calls the deployed `daily-brief` function with the signed-in user's session.
 *
 * No identity is sent in the body: `functions.invoke` attaches the caller's
 * access token, and the function derives the user from it server-side. Neither
 * the token nor any key is ever read, logged or rendered here.
 */
export type DailyBriefResult =
  | { ok: true; data: DailyBriefResponse }
  | { ok: false; message: string }

/**
 * The edge function answers in well under this; the timeout exists so a stalled
 * request ends in a retryable error instead of an indefinite spinner.
 */
export const REQUEST_TIMEOUT_MS = 15_000

const TIMEOUT_MESSAGE =
  'The brief took too long to arrive. Check your connection and retry.'

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Your session has expired. Sign in again to load your brief.',
  no_location: 'No primary location is set for this account, so there is nothing to brief.',
  not_configured: 'The brief service is not configured yet. Try again later.',
  lookup_failed: 'Your locations could not be read just now. Try again shortly.',
  preferences_unavailable: 'Your saved preferences could not be read just now. Try again shortly.',
  forecast_unavailable: 'The stored forecast could not be read just now. Try again shortly.',
}

/** The HTTP error class `functions.invoke` raises carries the response here. */
function httpErrorResponse(error: unknown): Response | null {
  if (typeof error !== 'object' || error === null) return null
  if ((error as { name?: unknown }).name !== 'FunctionsHttpError') return null

  const context = (error as { context?: unknown }).context
  return context instanceof Response ? context : null
}

async function readErrorCode(error: unknown): Promise<string | null> {
  const response = httpErrorResponse(error)

  if (!response) return null

  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null) {
      const code = (body as { error?: unknown }).error
      if (typeof code === 'string') return code
    }
  } catch {
    // A non-JSON error body carries no code; the status below still applies.
  }

  return null
}

export async function requestDailyBrief(): Promise<DailyBriefResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<DailyBriefResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve({ ok: false, message: TIMEOUT_MESSAGE })
    }, REQUEST_TIMEOUT_MS)
  })

  try {
    return await Promise.race([invokeBrief(controller.signal), timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function invokeBrief(signal: AbortSignal): Promise<DailyBriefResult> {
  const supabase = requireSupabase()

  let response: { data: unknown; error: unknown }
  try {
    const result = await supabase.functions.invoke<unknown>('daily-brief', {
      method: 'POST',
      signal,
    })
    response = { data: result.data, error: result.error }
  } catch {
    return signal.aborted
      ? { ok: false, message: TIMEOUT_MESSAGE }
      : { ok: false, message: 'The brief service could not be reached. Check your connection and retry.' }
  }

  const { data, error } = response

  if (error) {
    const code = await readErrorCode(error)

    if (code && ERROR_MESSAGES[code]) {
      return { ok: false, message: ERROR_MESSAGES[code] }
    }

    if (httpErrorResponse(error)) {
      return { ok: false, message: 'The brief could not be generated right now. Try again shortly.' }
    }

    return { ok: false, message: 'The brief service could not be reached. Check your connection and retry.' }
  }

  const parsed = parseBriefEnvelope(data)

  if (!parsed.ok) {
    return { ok: false, message: 'The brief service returned an unexpected response, so nothing is shown.' }
  }

  return { ok: true, data: parsed.data }
}
