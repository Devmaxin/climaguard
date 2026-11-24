import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'

/**
 * `unconfigured` is a first-class state, not an error: a build without the two
 * public Supabase variables still renders the whole product, and only the
 * account screens say why they cannot work.
 */
export type AuthStatus = 'unconfigured' | 'loading' | 'anonymous' | 'authenticated'

export type AuthState = {
  status: AuthStatus
  session: Session | null
}

export type AuthResult = {
  error: string | null
}

export type SignUpResult = AuthResult & {
  /** True when Supabase accepted the signup but wants the address confirmed first. */
  requiresConfirmation: boolean
}

export type Credentials = {
  email: string
  password: string
}

export type SignUpDetails = Credentials & {
  displayName: string
}

export type AuthContextValue = AuthState & {
  isConfigured: boolean
  signIn: (credentials: Credentials) => Promise<AuthResult>
  signUp: (details: SignUpDetails) => Promise<SignUpResult>
  signOut: () => Promise<AuthResult>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
