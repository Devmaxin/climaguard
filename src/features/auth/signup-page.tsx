import { Loader2, MailCheck, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthCard, AuthNotice } from '@/features/auth/auth-card'
import {
  MAX_DISPLAY_NAME_LENGTH,
  validateConfirmation,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '@/features/auth/validation'
import { Button } from '@/components/ui/button'
import { Field, FieldMessage, Input, Label } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

type FieldErrors = {
  displayName?: string
  email?: string
  password?: string
  confirmation?: string
}

function SignUpPage() {
  useDocumentTitle('Create your account')

  const { signUp, isConfigured } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting) return

    const errors: FieldErrors = {
      displayName: validateDisplayName(displayName) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirmation: validateConfirmation(password, confirmation) ?? undefined,
    }

    if (errors.displayName || errors.email || errors.password || errors.confirmation) {
      setFieldErrors(errors)
      setFormError(null)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setSubmitting(true)

    const trimmedEmail = email.trim()
    const { error, requiresConfirmation } = await signUp({
      email: trimmedEmail,
      password,
      displayName,
    })

    if (error) {
      setFormError(error)
      setSubmitting(false)
      return
    }

    if (requiresConfirmation) {
      // A session only exists once the emailed link is followed.
      setConfirmationSentTo(trimmedEmail)
      setSubmitting(false)
      return
    }

    navigate('/app', { replace: true })
  }

  if (confirmationSentTo) {
    return (
      <AuthCard
        eyebrow="Almost there"
        title="Confirm your email"
        description="Your account exists. One step left before you can sign in."
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-xl border border-lime/25 bg-lime/10 px-3.5 py-3.5">
            <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-lime-ink" />
            <div className="text-xs leading-relaxed text-fog">
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="mt-1">
                We sent a confirmation link to{' '}
                <span className="font-medium text-foreground">{confirmationSentTo}</span>. Open
                it, then sign in.
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-haze">
            The link can take a minute to arrive. If it does not, check spam before trying
            the address again.
          </p>

          <Button asChild size="lg" className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      eyebrow="Create account"
      title="Start your briefing"
      description="One account covers both personal and business mode — you can switch later."
    >
      {!isConfigured ? (
        <div className="mb-5">
          <AuthNotice tone="info" title="Accounts are not configured">
            This build has no Supabase credentials, so sign up is disabled. Add
            <code className="mx-1 rounded bg-veil px-1.5 py-0.5 text-[0.7rem]">
              VITE_SUPABASE_URL
            </code>
            and
            <code className="mx-1 rounded bg-veil px-1.5 py-0.5 text-[0.7rem]">
              VITE_SUPABASE_ANON_KEY
            </code>
            to <code className="rounded bg-veil px-1.5 py-0.5 text-[0.7rem]">.env.local</code>.
          </AuthNotice>
        </div>
      ) : null}

      {formError ? (
        <div className="mb-5">
          <AuthNotice tone="error" title="Could not create your account">
            {formError}
          </AuthNotice>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field>
          <Label htmlFor="signup-name">Your name</Label>
          <Input
            id="signup-name"
            name="name"
            autoComplete="name"
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            placeholder="Amara Okonkwo"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            aria-invalid={fieldErrors.displayName ? true : undefined}
            aria-describedby={fieldErrors.displayName ? 'signup-name-error' : undefined}
            disabled={!isConfigured || submitting}
          />
          {fieldErrors.displayName ? (
            <FieldMessage id="signup-name-error">{fieldErrors.displayName}</FieldMessage>
          ) : null}
        </Field>

        <Field>
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
            disabled={!isConfigured || submitting}
          />
          {fieldErrors.email ? (
            <FieldMessage id="signup-email-error">{fieldErrors.email}</FieldMessage>
          ) : null}
        </Field>

        <Field>
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput
            id="signup-password"
            name="new-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? 'signup-password-error' : 'signup-password-hint'
            }
            disabled={!isConfigured || submitting}
          />
          {fieldErrors.password ? (
            <FieldMessage id="signup-password-error">{fieldErrors.password}</FieldMessage>
          ) : (
            <FieldMessage id="signup-password-hint" tone="hint">
              Eight characters or more. A short phrase works better than a single word.
            </FieldMessage>
          )}
        </Field>

        <Field>
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <PasswordInput
            id="signup-confirm"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={fieldErrors.confirmation ? true : undefined}
            aria-describedby={fieldErrors.confirmation ? 'signup-confirm-error' : undefined}
            disabled={!isConfigured || submitting}
          />
          {fieldErrors.confirmation ? (
            <FieldMessage id="signup-confirm-error">{fieldErrors.confirmation}</FieldMessage>
          ) : null}
        </Field>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={!isConfigured || submitting}>
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              <UserPlus aria-hidden="true" />
              Create account
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-fog">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-cyan-ink underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}

export { SignUpPage }
