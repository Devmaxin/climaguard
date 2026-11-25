import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  AccountError,
  markOnboardingComplete,
  saveLocations,
  saveMode,
  savePreferences,
  saveProfileDetails,
} from '@/lib/account/account-api'
import { cityByKey } from '@/lib/cities'
import { useAccount } from '@/hooks/use-account'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  createDraft,
  hasErrors,
  stepOrder,
  toggleCity,
  toggleHazard,
  validateLocations,
  validateProfile,
  type FieldErrors,
  type OnboardingDraft,
  type OnboardingStep,
} from '@/features/onboarding/draft'
import { OnboardingShell } from '@/features/onboarding/onboarding-shell'
import { LocationStep } from '@/features/onboarding/steps/location-step'
import { ModeStep } from '@/features/onboarding/steps/mode-step'
import { PreferencesStep } from '@/features/onboarding/steps/preferences-step'
import { ProfileStep } from '@/features/onboarding/steps/profile-step'
import { ReviewStep } from '@/features/onboarding/steps/review-step'

const stepCopy: Record<OnboardingStep, { eyebrow: string; title: string; description: string }> = {
  mode: {
    eyebrow: 'Welcome to ClimaGuard',
    title: 'How will you use ClimaGuard?',
    description:
      'This sets how many places you can follow and what we ask for next. You can change it later.',
  },
  profile: {
    eyebrow: 'Your details',
    title: 'Tell us who we are setting this up for',
    description: 'This appears on your dashboard. Nothing here is shared publicly.',
  },
  location: {
    eyebrow: 'Monitoring',
    title: 'Which places should we watch?',
    description:
      'ClimaGuard currently covers three launch markets. Choose the ones that matter to you.',
  },
  preferences: {
    eyebrow: 'Preferences',
    title: 'What should we keep an eye on?',
    description: 'Pick the hazards you care about and how you would like updates described.',
  },
  review: {
    eyebrow: 'Almost done',
    title: 'Check your setup',
    description: 'Confirm these details and we will take you to your dashboard.',
  },
}

function OnboardingPage() {
  useDocumentTitle('Set up your account')

  const navigate = useNavigate()
  const { session } = useAuth()
  const { status, profile, preferences, locations, refresh } = useAccount()

  const [step, setStep] = useState<OnboardingStep>('mode')
  const [draft, setDraft] = useState<OnboardingDraft>(() => createDraft())
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  const seededRef = useRef(false)

  // Seed once from whatever is already stored, so returning to onboarding — or
  // reloading mid-flow — resumes with saved answers rather than blanks.
  useEffect(() => {
    if (status !== 'ready' || seededRef.current) return

    seededRef.current = true
    setDraft(createDraft({ profile, preferences, locations }))
  }, [status, profile, preferences, locations])

  const userId = session?.user.id ?? null
  const stepIndex = stepOrder.indexOf(step)

  const updateDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors({})
    setError(null)
  }, [])

  async function persistStep(target: OnboardingStep, id: string): Promise<boolean> {
    try {
      if (target === 'mode') {
        await saveMode(id, draft.mode)
      } else if (target === 'profile') {
        await saveProfileDetails(id, {
          displayName: draft.displayName,
          mode: draft.mode,
          businessName: draft.businessName,
          businessSector: draft.businessSector,
        })
      } else if (target === 'location') {
        await saveLocations(id, {
          cityKeys: draft.cityKeys,
          primary: draft.primary,
          labelFor: (key) => cityByKey.get(key)?.name ?? key,
        })
      } else if (target === 'preferences') {
        await savePreferences(id, {
          hazard_interests: draft.hazards,
          notify_email: draft.notifyEmail,
          notify_in_app: draft.notifyInApp,
          digest_frequency: draft.digest,
        })
      }

      return true
    } catch (caught) {
      setError(
        caught instanceof AccountError
          ? caught.message
          : 'We could not save that step. Check your connection and try again.',
      )
      return false
    }
  }

  async function handleContinue() {
    if (saving || completed) return

    setError(null)

    if (!userId) {
      setError('Your session has expired. Sign in again to continue.')
      return
    }

    if (step === 'profile') {
      const nextErrors = validateProfile(draft)
      if (hasErrors(nextErrors)) {
        setErrors(nextErrors)
        return
      }
    }

    if (step === 'location') {
      const nextErrors = validateLocations(draft)
      if (hasErrors(nextErrors)) {
        setErrors(nextErrors)
        return
      }
    }

    setSaving(true)
    const ok = await persistStep(step, userId)

    if (!ok) {
      setSaving(false)
      return
    }

    if (step === 'review') {
      try {
        // The flag lands last, so a failure anywhere above leaves onboarding
        // incomplete and the flow resumable.
        await markOnboardingComplete(userId)
        await refresh()
        setCompleted(true)
        setTimeout(() => navigate('/app', { replace: true }), 1400)
      } catch (caught) {
        setError(
          caught instanceof AccountError
            ? caught.message
            : 'We could not finish your setup. Try again.',
        )
      } finally {
        setSaving(false)
      }
      return
    }

    setSaving(false)
    setStep(stepOrder[stepIndex + 1])
  }

  function handleBack() {
    if (saving || stepIndex === 0) return
    setErrors({})
    setError(null)
    setStep(stepOrder[stepIndex - 1])
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div
        className="flex min-h-svh flex-col items-center justify-center gap-3 text-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 aria-hidden="true" className="size-5 animate-spin text-cyan-ink" />
        <p className="text-xs uppercase tracking-[0.18em] text-haze">Preparing your setup</p>
      </div>
    )
  }

  const copy = stepCopy[step]
  const isLast = step === 'review'

  return (
    <OnboardingShell
      current={step}
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
    >
      <div className="flex flex-col gap-7">
        {step === 'mode' ? (
          <ModeStep value={draft.mode} onChange={(mode) => updateDraft({ mode })} />
        ) : null}

        {step === 'profile' ? (
          <ProfileStep draft={draft} errors={errors} onChange={updateDraft} />
        ) : null}

        {step === 'location' ? (
          <LocationStep
            draft={draft}
            errors={errors}
            onToggle={(key) => {
              setDraft((current) => toggleCity(current, key))
              setErrors({})
              setError(null)
            }}
            onPrimary={(key) => {
              setDraft((current) => ({ ...current, primary: key }))
              setErrors({})
            }}
          />
        ) : null}

        {step === 'preferences' ? (
          <PreferencesStep
            draft={draft}
            onToggleHazard={(hazard) => {
              setDraft((current) => toggleHazard(current, hazard))
              setError(null)
            }}
            onChange={updateDraft}
          />
        ) : null}

        {step === 'review' ? (
          <ReviewStep
            draft={draft}
            saving={saving}
            completed={completed}
            error={error}
            onFinish={handleContinue}
          />
        ) : null}

        {error && step !== 'review' ? (
          <p
            role="alert"
            className="rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3 text-xs leading-relaxed text-danger-ink"
          >
            {error}
          </p>
        ) : null}

        {!completed && !isLast ? (
          <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={stepIndex === 0 || saving}
              className={stepIndex === 0 ? 'invisible' : undefined}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>

            <Button onClick={handleContinue} disabled={saving} size="lg" className="sm:min-w-40">
              {saving ? (
                <>
                  <Loader2 aria-hidden="true" className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        ) : null}

        {!completed && isLast ? (
          <div className="border-t border-hairline pt-5">
            <Button variant="ghost" onClick={handleBack} disabled={saving}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          </div>
        ) : null}
      </div>
    </OnboardingShell>
  )
}

export { OnboardingPage }
