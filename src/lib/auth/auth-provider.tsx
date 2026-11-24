import type { AuthError, Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  AuthContext,
  type AuthContextValue,
  type AuthResult,
  type AuthState,
  type Credentials,
  type SignUpDetails,
  type SignUpResult,
} from '@/lib/auth/auth-context'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'

const NOT_CONFIGURED_MESSAGE =
  'Accounts are not available in this build. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign in.'

/**
 * Supabase messages are aimed at developers. Translate the ones a person can
 * actually act on, and keep one neutral fallback so internal detail (table
 * names, constraint text) never reaches the UI.
 */
function describeAuthError(error: AuthError): string {
  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return 'That email and password combination is not correct.'
  }
  if (message.includes('email not confirmed')) {
    return 'Confirm your email address before signing in — check your inbox for the link.'
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'An account already exists for that email. Sign in instead.'
  }
  if (message.includes('password should be at least')) {
    return 'Choose a password with at least 8 characters.'
  }
  if (message.includes('unable to validate email') || message.includes('invalid email')) {
    return 'Enter a valid email address.'
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.'
  }
  if (message.includes('signups not allowed') || message.includes('signup is disabled')) {
    return 'New sign ups are currently disabled for this project.'
  }
  if (error.status === undefined || error.status >= 500) {
    return 'The account service is unavailable right now. Try again shortly.'
  }

  return 'We could not complete that request. Please try again.'
}

function initialState(): AuthState {
  return isSupabaseConfigured && supabase
    ? { status: 'loading', session: null }
    : { status: 'unconfigured', session: null }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  // Guards the read-on-mount against an auth event that lands first. Without
  // it a slow getSession could overwrite a fresher event with stale data.
  const settledRef = useRef(false)

  useEffect(() => {
    const client = supabase

    if (!client) {
      settledRef.current = true
      return
    }

    let active = true

    const apply = (session: Session | null) => {
      settledRef.current = true
      setState({
        status: session ? 'authenticated' : 'anonymous',
        session,
      })
    }

    // Subscribed before the initial read so a sign in that completes during
    // the read is still observed. The callback stays synchronous: calling back
    // into Supabase from inside it can deadlock the SDK's auth lock.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      apply(session)
    })

    void client.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (!active || settledRef.current) return

        // A failed read means no usable session; treat it as signed out rather
        // than leaving the app stuck on the loading state.
        apply(error ? null : sessionData.session)
      })
      .catch(() => {
        if (!active || settledRef.current) return
        apply(null)
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async ({ email, password }: Credentials): Promise<AuthResult> => {
    const client = supabase
    if (!client) return { error: NOT_CONFIGURED_MESSAGE }

    try {
      const { error } = await client.auth.signInWithPassword({ email, password })
      return { error: error ? describeAuthError(error) : null }
    } catch {
      return { error: 'Could not reach the account service. Check your connection.' }
    }
  }, [])

  const signUp = useCallback(
    async ({ email, password, displayName }: SignUpDetails): Promise<SignUpResult> => {
      const client = supabase
      if (!client) return { error: NOT_CONFIGURED_MESSAGE, requiresConfirmation: false }

      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        })

        if (error) return { error: describeAuthError(error), requiresConfirmation: false }

        // With email confirmation on, Supabase returns a user without a
        // session. That is success, but the person still has to click a link.
        return { error: null, requiresConfirmation: Boolean(data.user && !data.session) }
      } catch {
        return {
          error: 'Could not reach the account service. Check your connection.',
          requiresConfirmation: false,
        }
      }
    },
    [],
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const client = supabase
    if (!client) return { error: NOT_CONFIGURED_MESSAGE }

    try {
      const { error } = await client.auth.signOut()
      return { error: error ? describeAuthError(error) : null }
    } catch {
      return { error: 'Could not reach the account service. Check your connection.' }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isConfigured: Boolean(isSupabaseConfigured && supabase),
      signIn,
      signUp,
      signOut,
    }),
    [state, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }
