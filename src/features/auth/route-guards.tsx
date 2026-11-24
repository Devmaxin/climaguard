import { Loader2, ShieldAlert } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

type RedirectState = { from?: string }

function AuthGate({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 aria-hidden="true" className="size-5 animate-spin text-cyan-ink" />
      <p className="text-xs uppercase tracking-[0.18em] text-haze">{label}</p>
    </div>
  )
}

/**
 * Reachable only when the build has credentials. Without them there is no
 * session to check, so the honest answer is an explanation, not a redirect
 * loop between /login and /app.
 */
function UnconfiguredGate() {
  return (
    <div className="flex min-h-svh items-center justify-center px-5 py-16">
      <Card className="w-full max-w-md rounded-3xl p-7">
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-hairline bg-veil text-cyan-ink">
          <ShieldAlert aria-hidden="true" className="size-4" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em]">
          Accounts are not configured
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fog">
          This build has no Supabase credentials, so there is no session to open. Set
          <code className="mx-1 rounded bg-veil px-1.5 py-0.5 text-[0.72rem]">
            VITE_SUPABASE_URL
          </code>
          and
          <code className="mx-1 rounded bg-veil px-1.5 py-0.5 text-[0.72rem]">
            VITE_SUPABASE_ANON_KEY
          </code>
          in <code className="rounded bg-veil px-1.5 py-0.5 text-[0.72rem]">.env.local</code> and
          restart the dev server.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link to="/">Back to the site</Link>
        </Button>
      </Card>
    </div>
  )
}

function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthGate label="Restoring your session" />
  if (status === 'unconfigured') return <UnconfiguredGate />

  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` } satisfies RedirectState}
      />
    )
  }

  return <Outlet />
}

/**
 * Keeps signed-in people out of the account forms. While the session is still
 * loading nothing renders, so a returning user never sees the login form flash
 * before being sent on.
 */
function RedirectIfAuthenticated() {
  const { status } = useAuth()
  const location = useLocation()
  const from = (location.state as RedirectState | null)?.from

  if (status === 'loading') return <AuthGate label="Checking your session" />

  if (status === 'authenticated') {
    return <Navigate to={from && from.startsWith('/app') ? from : '/app'} replace />
  }

  return <Outlet />
}

export { RedirectIfAuthenticated, RequireAuth }
