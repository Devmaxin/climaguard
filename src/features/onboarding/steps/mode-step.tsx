import { Building2, Check, Home, MapPin } from 'lucide-react'

import type { UserMode } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'

const modes = [
  {
    value: 'personal' as const,
    icon: Home,
    title: 'Personal',
    tagline: 'For you and your household',
    description:
      'Track climate conditions for the place you live, and get a daily read on what is coming.',
    points: ['One monitored location', 'Hazards you choose', 'Personal daily digest'],
  },
  {
    value: 'business' as const,
    icon: Building2,
    title: 'Business',
    tagline: 'For operations and sites',
    description:
      'Follow several operating locations at once and keep an eye on conditions that disrupt them.',
    points: ['Up to five monitored locations', 'A primary operating site', 'Business profile fields'],
  },
]

function ModeStep({
  value,
  onChange,
}: {
  value: UserMode
  onChange: (mode: UserMode) => void
}) {
  return (
    <fieldset>
      <legend className="sr-only">Choose how you will use ClimaGuard</legend>

      <div className="grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon
          const selected = value === mode.value

          return (
            <label
              key={mode.value}
              className={cn(
                'group relative flex cursor-pointer flex-col rounded-3xl border p-5 transition-all duration-300',
                'focus-within:ring-2 focus-within:ring-cyan-ink/40',
                selected
                  ? 'border-cyan/45 bg-cyan/[0.07] shadow-[0_24px_60px_-40px_rgba(53,198,217,0.9)]'
                  : 'border-hairline bg-surface/60 hover:border-cyan/25 hover:bg-surface',
              )}
            >
              <input
                type="radio"
                name="user-mode"
                value={mode.value}
                checked={selected}
                onChange={() => onChange(mode.value)}
                className="sr-only"
              />

              <span className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'inline-flex size-11 items-center justify-center rounded-2xl border',
                    selected
                      ? 'border-cyan/40 bg-cyan/15 text-cyan-ink'
                      : 'border-hairline bg-veil text-fog group-hover:text-cyan-ink',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full border transition-colors',
                    selected
                      ? 'border-cyan bg-cyan text-on-accent'
                      : 'border-hairline bg-transparent text-transparent',
                  )}
                >
                  <Check className="size-3" />
                </span>
              </span>

              <span className="mt-4 block font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
                {mode.title}
              </span>
              <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-haze">
                {mode.tagline}
              </span>
              <span className="mt-3 block text-sm leading-relaxed text-fog">
                {mode.description}
              </span>

              <span className="mt-4 flex flex-col gap-1.5 border-t border-hairline pt-4">
                {mode.points.map((point) => (
                  <span key={point} className="flex items-center gap-2 text-xs text-fog">
                    <MapPin
                      aria-hidden="true"
                      className={cn('size-3.5', selected ? 'text-lime-ink' : 'text-haze')}
                    />
                    {point}
                  </span>
                ))}
              </span>
            </label>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-haze">
        Your account type can be changed later. A personal account follows exactly one location;
        a business account can follow up to five.
      </p>
    </fieldset>
  )
}

export { ModeStep }
