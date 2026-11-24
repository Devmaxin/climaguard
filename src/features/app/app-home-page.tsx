import { Loader2, LogOut, MapPin, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

function AppHomePage() {
  useDocumentTitle('Your account')

  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const metadataName = session?.user.user_metadata?.display_name
  const displayName =
    typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null

  async function handleSignOut() {
    if (signingOut) return

    setSigningOut(true)
    setError(null)

    const result = await signOut()

    if (result.error) {
      setError(result.error)
      setSigningOut(false)
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto w-full max-w-3xl">
        <p className="eyebrow">Signed in</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {displayName ? `Welcome, ${displayName}.` : 'You are signed in.'}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-fog">
          Your session is live and stored by the Supabase client. Onboarding and the climate
          dashboard are the next pieces of work — nothing here is simulated in the meantime.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl p-5">
            <p className="eyebrow">Account</p>
            <p className="mt-3 text-sm font-medium text-foreground break-all">
              {session?.user.email ?? 'No email on this session'}
            </p>
            <p className="mt-1 text-xs text-haze">
              Session expires {session?.expires_at
                ? new Date(session.expires_at * 1000).toLocaleString()
                : 'unknown'}
            </p>
          </Card>

          <Card className="rounded-2xl p-5">
            <p className="eyebrow">Next up</p>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-fog">
              <li className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="size-3.5 text-lime-ink" />
                Onboarding and mode selection
              </li>
              <li className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-3.5 text-cyan-ink" />
                Monitored locations
              </li>
            </ul>
          </Card>
        </div>

        {error ? (
          <p role="alert" className="mt-6 text-xs text-danger-ink">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" />
                Signing out…
              </>
            ) : (
              <>
                <LogOut aria-hidden="true" />
                Sign out
              </>
            )}
          </Button>
        </div>
      </div>
    </Container>
  )
}

export { AppHomePage }
