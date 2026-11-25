import {
  Check,
  CloudLightning,
  Droplets,
  Mail,
  Smartphone,
  Sun,
  ThermometerSun,
  Waves,
  Wind,
} from 'lucide-react'

import { FieldMessage } from '@/components/ui/input'
import type { DigestFrequency, HazardInterest } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import type { OnboardingDraft } from '@/features/onboarding/draft'

const hazardOptions: {
  value: HazardInterest
  label: string
  description: string
  icon: typeof Droplets
}[] = [
  {
    value: 'flood',
    label: 'Flood',
    description: 'Flash flooding and standing water',
    icon: Droplets,
  },
  { value: 'heat', label: 'Heat', description: 'High heat and humidity stress', icon: ThermometerSun },
  {
    value: 'storm',
    label: 'Storms',
    description: 'Heavy rain, wind and thunder',
    icon: CloudLightning,
  },
  { value: 'air_quality', label: 'Air quality', description: 'Pollution and haze', icon: Wind },
  { value: 'drought', label: 'Drought', description: 'Sustained dry conditions', icon: Sun },
  { value: 'coastal', label: 'Coastal risks', description: 'Surge and shoreline change', icon: Waves },
]

const digestOptions: { value: DigestFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'One summary each morning' },
  { value: 'weekly', label: 'Weekly', description: 'One summary each week' },
  { value: 'off', label: 'Off', description: 'No digests for now' },
]

function ToggleRow({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  id: string
  icon: typeof Mail
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-hairline bg-surface/60 px-4 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-hairline bg-veil text-cyan-ink">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p id={`${id}-label`} className="text-sm font-medium text-foreground">
            {title}
          </p>
          <p id={`${id}-description`} className="mt-0.5 text-xs leading-relaxed text-fog">
            {description}
          </p>
        </div>
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-ink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          checked ? 'border-cyan/50 bg-cyan/70' : 'border-hairline bg-veil-strong',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block size-4 rounded-full bg-background shadow transition-transform duration-200',
            checked ? 'translate-x-[1.45rem]' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}

type PreferencesStepProps = {
  draft: OnboardingDraft
  onToggleHazard: (hazard: HazardInterest) => void
  onChange: (patch: Partial<OnboardingDraft>) => void
}

function PreferencesStep({ draft, onToggleHazard, onChange }: PreferencesStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <fieldset>
        <legend className="text-sm font-medium text-foreground">Hazards you care about</legend>
        <p className="mt-1 text-xs leading-relaxed text-fog">
          These shape what your dashboard surfaces first. Choose as many as you like.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {hazardOptions.map((hazard) => {
            const Icon = hazard.icon
            const selected = draft.hazards.includes(hazard.value)

            return (
              <label
                key={hazard.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200',
                  'focus-within:ring-2 focus-within:ring-cyan-ink/40',
                  selected
                    ? 'border-cyan/40 bg-cyan/[0.07]'
                    : 'border-hairline bg-surface/60 hover:border-cyan/25 hover:bg-surface',
                )}
              >
                <input
                  type="checkbox"
                  value={hazard.value}
                  checked={selected}
                  onChange={() => onToggleHazard(hazard.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl border',
                    selected
                      ? 'border-cyan/40 bg-cyan/15 text-cyan-ink'
                      : 'border-hairline bg-veil text-haze',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{hazard.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-fog">
                    {hazard.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    selected ? 'border-cyan bg-cyan text-on-accent' : 'border-hairline text-transparent',
                  )}
                >
                  <Check className="size-2.5" />
                </span>
              </label>
            )
          })}
        </div>

        {draft.hazards.length === 0 ? (
          <FieldMessage tone="hint" className="mt-3">
            Nothing selected yet — you can still continue and choose later.
          </FieldMessage>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Notifications</legend>
        <p className="mt-1 text-xs leading-relaxed text-fog">
          Saved as preferences for now. Delivery is not switched on yet, so nothing will be sent.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <ToggleRow
            id="notify-in-app"
            icon={Smartphone}
            title="In-app notifications"
            description="Show updates inside ClimaGuard."
            checked={draft.notifyInApp}
            onChange={(checked) => onChange({ notifyInApp: checked })}
          />
          <ToggleRow
            id="notify-email"
            icon={Mail}
            title="Email notifications"
            description="Send updates to the address on your account."
            checked={draft.notifyEmail}
            onChange={(checked) => onChange({ notifyEmail: checked })}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Digest frequency</legend>

        <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Digest frequency">
          {digestOptions.map((option) => {
            const selected = draft.digest === option.value

            return (
              <label
                key={option.value}
                className={cn(
                  'cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors duration-200',
                  'focus-within:ring-2 focus-within:ring-cyan-ink/40',
                  selected
                    ? 'border-lime/40 bg-lime/[0.07]'
                    : 'border-hairline bg-surface/60 hover:border-cyan/25',
                )}
              >
                <input
                  type="radio"
                  name="digest"
                  value={option.value}
                  checked={selected}
                  onChange={() => onChange({ digest: option.value })}
                  className="sr-only"
                />
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="mt-0.5 block text-xs text-fog">{option.description}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}

export { PreferencesStep }
