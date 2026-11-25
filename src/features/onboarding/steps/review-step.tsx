import { ArrowRight, Building2, Check, Home, Loader2, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cities } from '@/lib/cities'
import type { OnboardingDraft } from '@/features/onboarding/draft'
import { cn } from '@/lib/utils'

const hazardLabels: Record<string, string> = {
  flood: 'Flood',
  heat: 'Heat',
  storm: 'Storms',
  air_quality: 'Air quality',
  drought: 'Drought',
  coastal: 'Coastal risks',
}

const digestLabels: Record<string, string> = {
  daily: 'Daily digest',
  weekly: 'Weekly digest',
  off: 'No digest',
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-xs uppercase tracking-[0.14em] text-haze">{label}</dt>
      <dd className="text-sm text-foreground sm:text-right">{children}</dd>
    </div>
  )
}

function ReviewStep({
  draft,
  saving,
  completed,
  error,
  onFinish,
}: {
  draft: OnboardingDraft
  saving: boolean
  completed: boolean
  error: string | null
  onFinish: () => void
}) {
  const selectedCities = cities.filter((city) => draft.cityKeys.includes(city.key))
  const primary = selectedCities.find((city) => city.key === draft.primary) ?? selectedCities[0]
  const isBusiness = draft.mode === 'business'

  if (completed) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-lime/25 bg-lime/[0.05] px-6 py-12 text-center">
        <span
          className="inline-flex size-14 items-center justify-center rounded-2xl border border-lime/40 bg-lime/15 text-lime-ink"
          aria-hidden="true"
        >
          <Check className="size-7" />
        </span>
        <h2
          role="status"
          className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground"
        >
          You are set up
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-fog">
          Your profile, {selectedCities.length === 1 ? 'location' : 'locations'} and preferences
          are saved. Taking you to your dashboard.
        </p>
        <Button asChild className="mt-6">
          <Link to="/app">
            Open dashboard
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border border-hairline bg-surface/60 p-5 sm:p-6">
        <dl className="flex flex-col">
          <SummaryRow label="Account type">
            <span className="inline-flex items-center gap-2">
              {isBusiness ? (
                <Building2 aria-hidden="true" className="size-4 text-cyan-ink" />
              ) : (
                <Home aria-hidden="true" className="size-4 text-cyan-ink" />
              )}
              {isBusiness ? 'Business' : 'Personal'}
            </span>
          </SummaryRow>

          <SummaryRow label="Name">{draft.displayName.trim() || '—'}</SummaryRow>

          {isBusiness ? (
            <>
              <SummaryRow label="Business">{draft.businessName.trim() || '—'}</SummaryRow>
              <SummaryRow label="Sector">{draft.businessSector.trim() || '—'}</SummaryRow>
            </>
          ) : null}

          <SummaryRow label={selectedCities.length === 1 ? 'Location' : 'Locations'}>
            <span className="flex flex-wrap gap-1.5 sm:justify-end">
              {selectedCities.length === 0 ? '—' : null}
              {selectedCities.map((city) => (
                <span
                  key={city.key}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                    city.key === primary?.key
                      ? 'border-lime/30 bg-lime/10 text-lime-ink'
                      : 'border-hairline bg-veil text-fog',
                  )}
                >
                  <MapPin aria-hidden="true" className="size-3" />
                  {city.name}
                  {city.key === primary?.key ? <span className="text-[0.65rem]">primary</span> : null}
                </span>
              ))}
            </span>
          </SummaryRow>

          <SummaryRow label="Hazards">
            <span className="flex flex-wrap gap-1.5 sm:justify-end">
              {draft.hazards.length === 0 ? '—' : null}
              {draft.hazards.map((hazard) => (
                <span
                  key={hazard}
                  className="rounded-full border border-hairline bg-veil px-2.5 py-1 text-xs text-fog"
                >
                  {hazardLabels[hazard] ?? hazard}
                </span>
              ))}
            </span>
          </SummaryRow>

          <SummaryRow label="Updates">
            {[draft.notifyInApp ? 'In-app' : null, draft.notifyEmail ? 'Email' : null]
              .filter(Boolean)
              .join(' · ') || 'None'}{' '}
            · {digestLabels[draft.digest] ?? draft.digest}
          </SummaryRow>
        </dl>
      </div>

      <p className="rounded-2xl border border-cyan/25 bg-cyan/[0.06] px-4 py-3 text-xs leading-relaxed text-fog">
        <span className="inline-flex items-center gap-1.5 font-medium text-cyan-ink">
          <Sparkles aria-hidden="true" className="size-3.5" />
          About updates
        </span>
        <br />
        Notification settings are saved with your account. Delivery is not switched on yet, so no
        messages will be sent until that work is complete.
      </p>

      {error ? (
        <p role="alert" className="rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3 text-xs text-danger-ink">
          {error}
        </p>
      ) : null}

      <Button onClick={onFinish} disabled={saving} size="lg">
        {saving ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Saving your setup…
          </>
        ) : (
          <>
            Finish setup
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </div>
  )
}

export { ReviewStep }
