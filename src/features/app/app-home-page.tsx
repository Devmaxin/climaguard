import {
  Building2,
  Compass,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Radar,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Container } from '@/components/layout/container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cityByKey } from '@/lib/cities'
import type { HazardInterest } from '@/lib/supabase/database.types'
import { useAccount } from '@/hooks/use-account'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ClimateForecastCard } from '@/features/app/climate-forecast-card'
import { DailyBriefCard } from '@/features/app/daily-brief-card'

const hazardLabels: Record<HazardInterest, string> = {
  flood: 'Flood',
  heat: 'Heat',
  storm: 'Storms',
  air_quality: 'Air quality',
  drought: 'Drought',
  coastal: 'Coastal risks',
}

const digestLabels = {
  daily: 'Daily digest',
  weekly: 'Weekly digest',
  off: 'No digest',
} as const

function AppHomePage() {
  useDocumentTitle('Your dashboard')

  const { session, signOut } = useAuth()
  const { profile, preferences, locations } = useAccount()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayName = profile?.display_name?.trim() || null
  const isBusiness = profile?.user_mode === 'business'
  const primaryLocation = locations.find((location) => location.is_primary) ?? locations[0] ?? null
  const primaryCity = primaryLocation ? cityByKey.get(primaryLocation.city_key) : null
  const hazards = preferences?.hazard_interests ?? []

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
    <Container className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isBusiness ? 'signal' : 'default'}>
            {isBusiness ? (
              <Building2 aria-hidden="true" className="size-3.5" />
            ) : (
              <Home aria-hidden="true" className="size-3.5" />
            )}
            {isBusiness ? 'Business account' : 'Personal account'}
          </Badge>
          {profile?.onboarding_completed ? (
            <Badge variant="outline">Setup complete</Badge>
          ) : null}
        </div>

        <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-4xl">
          {displayName ? `Welcome, ${displayName}.` : 'Welcome to ClimaGuard.'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog">
          Your account is set up. Forecast values below come from ECMWF's operational model, and the
          daily brief is derived from that same stored forecast.
        </p>

        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          <Card className="rounded-3xl p-5 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Primary location</p>
                {primaryCity ? (
                  <>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-foreground">
                      {primaryCity.name}
                    </h2>
                    <p className="mt-1 text-xs text-haze">
                      {primaryCity.country} · {primaryCity.region}
                    </p>
                  </>
                ) : (
                  <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
                    No location selected
                  </h2>
                )}
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-veil text-cyan-ink">
                <MapPin aria-hidden="true" className="size-5" />
              </span>
            </div>

            {primaryCity ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-fog">{primaryCity.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {primaryCity.exposures.map((exposure) => (
                    <span
                      key={exposure}
                      className="rounded-full border border-hairline bg-veil px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-haze"
                    >
                      {exposure}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {locations.length > 1 ? (
              <div className="mt-5 border-t border-hairline pt-4">
                <p className="text-xs uppercase tracking-[0.14em] text-haze">
                  Also monitoring
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {locations
                    .filter((location) => location.id !== primaryLocation?.id)
                    .map((location) => (
                      <li
                        key={location.id}
                        className="rounded-full border border-hairline bg-veil px-2.5 py-1 text-xs text-fog"
                      >
                        {cityByKey.get(location.city_key)?.name ?? location.label}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="rounded-3xl p-5">
            <p className="eyebrow">Climate interests</p>
            {hazards.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {hazards.map((hazard) => (
                  <li
                    key={hazard}
                    className="rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-xs text-cyan-ink"
                  >
                    {hazardLabels[hazard]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-fog">No hazards selected yet.</p>
            )}

            <div className="mt-5 border-t border-hairline pt-4">
              <p className="eyebrow">Updates</p>
              <p className="mt-2 text-sm text-fog">
                {preferences ? digestLabels[preferences.digest_frequency] : 'Not configured'}
                {preferences
                  ? ` · ${[preferences.notify_in_app ? 'In-app' : null, preferences.notify_email ? 'Email' : null]
                      .filter(Boolean)
                      .join(' + ') || 'No channels'}`
                  : ''}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-haze">
                Saved preferences only — delivery is not switched on yet.
              </p>
            </div>
          </Card>
        </div>

        {primaryLocation && primaryCity ? (
          <>
            <ClimateForecastCard cityKey={primaryLocation.city_key} cityName={primaryCity.name} />
            <DailyBriefCard cityKey={primaryLocation.city_key} />
          </>
        ) : null}

        <Card className="mt-4 rounded-3xl border-cyan/25 bg-cyan/[0.05] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 text-cyan-ink">
              <Radar aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
                What this page assesses — and what it does not
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fog">
                Forecast data is live, and the brief above is built from it. Only wind is classified
                so far, against the published Beaufort scale. Flood, heat, air quality, drought and
                coastal hazards are deliberately left unassessed rather than estimated, and nothing
                on this page is invented to fill the gap.
              </p>
              <ul className="mt-4 grid gap-2 text-xs text-fog sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <Sparkles aria-hidden="true" className="size-3.5 text-lime-ink" />
                  ECMWF forecasts — live
                </li>
                <li className="flex items-center gap-2">
                  <Compass aria-hidden="true" className="size-3.5 text-cyan-ink" />
                  Wind risk classification — live
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6">
          <p className="text-xs text-haze">
            Signed in as{' '}
            <span className="text-fog">{session?.user.email ?? 'an account without an email'}</span>
          </p>

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

        {error ? (
          <p role="alert" className="mt-4 text-xs text-danger-ink">
            {error}
          </p>
        ) : null}
      </div>
    </Container>
  )
}

export { AppHomePage }
