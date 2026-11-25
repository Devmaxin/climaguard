import { Field, FieldMessage, Input, Label } from '@/components/ui/input'
import {
  MAX_BUSINESS_NAME,
  MAX_BUSINESS_SECTOR,
  MAX_DISPLAY_NAME,
  type FieldErrors,
  type OnboardingDraft,
} from '@/features/onboarding/draft'

const sectorSuggestions = [
  'Agriculture',
  'Construction',
  'Energy',
  'Financial services',
  'Healthcare',
  'Logistics',
  'Manufacturing',
  'Retail',
  'Telecommunications',
  'Utilities',
]

type ProfileStepProps = {
  draft: OnboardingDraft
  errors: FieldErrors
  onChange: (patch: Partial<OnboardingDraft>) => void
}

function ProfileStep({ draft, errors, onChange }: ProfileStepProps) {
  const isBusiness = draft.mode === 'business'

  return (
    <div className="flex flex-col gap-5">
      <Field>
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          name="displayName"
          value={draft.displayName}
          onChange={(event) => onChange({ displayName: event.target.value })}
          maxLength={MAX_DISPLAY_NAME}
          autoComplete="name"
          placeholder={isBusiness ? 'Your name' : 'How should we address you?'}
          aria-invalid={Boolean(errors.displayName)}
          aria-describedby={errors.displayName ? 'display-name-error' : undefined}
        />
        {errors.displayName ? (
          <FieldMessage id="display-name-error">{errors.displayName}</FieldMessage>
        ) : (
          <FieldMessage tone="hint">
            Shown on your dashboard. Up to {MAX_DISPLAY_NAME} characters.
          </FieldMessage>
        )}
      </Field>

      {isBusiness ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              name="businessName"
              value={draft.businessName}
              onChange={(event) => onChange({ businessName: event.target.value })}
              maxLength={MAX_BUSINESS_NAME}
              autoComplete="organization"
              placeholder="Registered or trading name"
              aria-invalid={Boolean(errors.businessName)}
              aria-describedby={errors.businessName ? 'business-name-error' : undefined}
            />
            {errors.businessName ? (
              <FieldMessage id="business-name-error">{errors.businessName}</FieldMessage>
            ) : (
              <FieldMessage tone="hint">Up to {MAX_BUSINESS_NAME} characters.</FieldMessage>
            )}
          </Field>

          <Field>
            <Label htmlFor="business-sector">Sector</Label>
            <Input
              id="business-sector"
              name="businessSector"
              value={draft.businessSector}
              onChange={(event) => onChange({ businessSector: event.target.value })}
              maxLength={MAX_BUSINESS_SECTOR}
              list="business-sectors"
              placeholder="e.g. Logistics"
              aria-invalid={Boolean(errors.businessSector)}
              aria-describedby={errors.businessSector ? 'business-sector-error' : undefined}
            />
            <datalist id="business-sectors">
              {sectorSuggestions.map((sector) => (
                <option key={sector} value={sector} />
              ))}
            </datalist>
            {errors.businessSector ? (
              <FieldMessage id="business-sector-error">{errors.businessSector}</FieldMessage>
            ) : (
              <FieldMessage tone="hint">
                What the business does. Up to {MAX_BUSINESS_SECTOR} characters.
              </FieldMessage>
            )}
          </Field>
        </div>
      ) : (
        <p className="rounded-2xl border border-hairline bg-veil px-4 py-3 text-xs leading-relaxed text-fog">
          You are setting up a personal account, so no business details are needed. Switch to
          Business on the previous step if that is not right.
        </p>
      )}
    </div>
  )
}

export { ProfileStep }
