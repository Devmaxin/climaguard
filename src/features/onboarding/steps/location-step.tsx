import { Check, Globe2, Star } from 'lucide-react'

import { FieldMessage } from '@/components/ui/input'
import { cities } from '@/lib/cities'
import type { CityKey } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import {
  locationLimit,
  type FieldErrors,
  type OnboardingDraft,
} from '@/features/onboarding/draft'

type LocationStepProps = {
  draft: OnboardingDraft
  errors: FieldErrors
  onToggle: (key: CityKey) => void
  onPrimary: (key: CityKey) => void
}

function LocationStep({ draft, errors, onToggle, onPrimary }: LocationStepProps) {
  const limit = locationLimit(draft.mode)
  const atLimit = draft.cityKeys.length >= limit

  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="sr-only">Launch markets you want to follow</legend>

        <div className="grid gap-4">
          {cities.map((city) => {
            const selected = draft.cityKeys.includes(city.key)
            const blocked = !selected && atLimit && draft.mode === 'business'
            const primary = draft.primary === city.key && selected

            return (
              <label
                key={city.key}
                aria-disabled={blocked}
                className={cn(
                  'group relative flex cursor-pointer flex-col gap-4 rounded-3xl border p-5 transition-all duration-300 sm:flex-row sm:items-center sm:gap-5',
                  'focus-within:ring-2 focus-within:ring-cyan-ink/40',
                  selected
                    ? 'border-cyan/45 bg-cyan/[0.07] shadow-[0_24px_60px_-44px_rgba(53,198,217,0.9)]'
                    : 'border-hairline bg-surface/60 hover:border-cyan/25 hover:bg-surface',
                  blocked && 'cursor-not-allowed opacity-55 hover:border-hairline hover:bg-surface/60',
                )}
              >
                <input
                  type="checkbox"
                  name="cities"
                  value={city.key}
                  checked={selected}
                  disabled={blocked}
                  onChange={() => onToggle(city.key)}
                  className="sr-only"
                />

                <span
                  className={cn(
                    'inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border',
                    selected
                      ? 'border-cyan/40 bg-cyan/15 text-cyan-ink'
                      : 'border-hairline bg-veil text-haze group-hover:text-cyan-ink',
                  )}
                >
                  <Globe2 aria-hidden="true" className="size-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
                      {city.name}
                    </span>
                    <span className="text-xs text-haze">
                      {city.country} · {city.region}
                    </span>
                    {primary ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-lime-ink">
                        <Star aria-hidden="true" className="size-3" />
                        Primary
                      </span>
                    ) : null}
                  </span>

                  <span className="mt-1.5 block text-sm leading-relaxed text-fog">
                    {city.summary}
                  </span>

                  <span className="mt-2.5 flex flex-wrap gap-1.5">
                    {city.exposures.map((exposure) => (
                      <span
                        key={exposure}
                        className="rounded-full border border-hairline bg-veil px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.12em] text-haze"
                      >
                        {exposure}
                      </span>
                    ))}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    selected
                      ? 'border-cyan bg-cyan text-on-accent'
                      : 'border-hairline text-transparent',
                  )}
                >
                  <Check className="size-3" />
                </span>
              </label>
            )
          })}
        </div>

        {errors.cities ? (
          <FieldMessage className="mt-3">{errors.cities}</FieldMessage>
        ) : (
          <FieldMessage tone="hint" className="mt-3">
            {draft.mode === 'personal'
              ? 'A personal account follows exactly one location. Choosing another replaces your current pick.'
              : `Choose up to ${limit} locations. ${draft.cityKeys.length} of ${limit} selected.`}
          </FieldMessage>
        )}
      </fieldset>

      {draft.cityKeys.length > 1 ? (
        <fieldset className="rounded-3xl border border-hairline bg-surface/60 p-5">
          <legend className="px-1 text-xs font-medium uppercase tracking-[0.14em] text-haze">
            Primary location
          </legend>
          <p className="mt-1 text-xs leading-relaxed text-fog">
            Your primary location anchors the daily view.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {cities
              .filter((city) => draft.cityKeys.includes(city.key))
              .map((city) => {
                const selected = draft.primary === city.key

                return (
                  <label
                    key={city.key}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                      'focus-within:ring-2 focus-within:ring-cyan-ink/40',
                      selected
                        ? 'border-lime/35 bg-lime/[0.07] text-foreground'
                        : 'border-hairline text-fog hover:border-cyan/25 hover:text-foreground',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="primary-location"
                        value={city.key}
                        checked={selected}
                        onChange={() => onPrimary(city.key)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'inline-flex size-4 items-center justify-center rounded-full border',
                          selected ? 'border-lime bg-lime text-on-accent' : 'border-hairline',
                        )}
                      >
                        {selected ? <Check className="size-2.5" /> : null}
                      </span>
                      {city.name}
                    </span>
                    <span className="text-xs text-haze">{city.country}</span>
                  </label>
                )
              })}
          </div>

          {errors.primary ? <FieldMessage className="mt-3">{errors.primary}</FieldMessage> : null}
        </fieldset>
      ) : null}
    </div>
  )
}

export { LocationStep }
