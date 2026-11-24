import { Loader2, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AuthCard, AuthNotice } from '@/features/auth/auth-card'
import { validateEmail, validatePassword } from '@/features/auth/validation'
import { Button } from '@/components/ui/button'
import { Field, FieldMessage, Input, Label } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/hooks/use-auth'
import { useDocumentTitle } from '@/hooks/use-document-title'

type RedirectState = { from?: string }

function LoginPage() {
  useDocumentTitle('Sign in')

  const { signIn, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = (location.state as RedirectState | null)?.from ?? '/app'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting) return

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setFieldErrors({ email: emailError ?? undefined, password: passwordError ?? undefined })
      setFormError(null)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setSubmitting(true)

    const { error } = await signIn({ email: email.trim(), password })

    if (error) {
      setFormError(error)
      setSubmitting(false)
      return
    }

    // The session is live at this point; the route guard would also redirect,
    // but navigating here keeps the transition immediate.
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthCard
      eyebrow="Account"
      title="Welcome back"
      description="Sign in to pick up your briefing, locations and preferences."
    >
      {!isConfigured ? (
        <div className="mb-5">
          <AuthNotice tone="info" title="Accounts are not configured">
            This build has no Supabase credentials, so sign in is disabled. Add
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
          <AuthNotice tone="error" title="Could not sign in">
            {formError}
          </AuthNotice>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
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
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            disabled={!isConfigured || submitting}
          />
          {fieldErrors.email ? (
            <FieldMessage id="login-email-error">{fieldErrors.email}</FieldMessage>
          ) : null}
        </Field>

        <Field>
          <Label htmlFor="login-password">Password</Label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            disabled={!isConfigured || submitting}
          />
          {fieldErrors.password ? (
            <FieldMessage id="login-password-error">{fieldErrors.password}</FieldMessage>
          ) : null}
        </Field>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={!isConfigured || submitting}>
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn aria-hidden="true" />
              Sign in
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-fog">
        New to ClimaGuard?{' '}
        <Link
          to="/signup"
          className="font-medium text-cyan-ink underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}

export { LoginPage }
