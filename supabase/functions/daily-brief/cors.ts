/**
 * CORS decision for the Daily Brief, kept free of Deno globals so it can be
 * exercised by the ordinary test runner.
 *
 * Only the configured application origin is ever echoed back. An origin that
 * does not match exactly — and a request that sends no `Origin` at all — gets
 * `null`, which means no `access-control-allow-origin` header is emitted and
 * the browser refuses to hand the response to the page.
 */

export const ALLOW_HEADERS = 'authorization, content-type, apikey, x-client-info'
export const ALLOW_METHODS = 'POST, OPTIONS'

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin ? { 'access-control-allow-origin': origin } : {}),
    'access-control-allow-headers': ALLOW_HEADERS,
    'access-control-allow-methods': ALLOW_METHODS,
    vary: 'Origin',
  }
}

/**
 * `APP_ORIGIN` unset is the local-development case and falls back to `*`. Once
 * it is set, only an exact match is granted and nothing is reflected.
 */
export function resolveOrigin(
  configured: string | undefined | null,
  requestOrigin: string | null,
): string | null {
  const allowed = configured?.trim()

  if (!allowed) return '*'

  const incoming = requestOrigin?.trim() ?? ''
  return incoming === allowed ? allowed : null
}
