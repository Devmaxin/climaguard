import { createContext } from 'react'

import type { Preferences, Profile, SavedLocation } from '@/lib/account/account-api'

/**
 * `idle` is the anonymous (and unconfigured) case: there is no account to load,
 * which is not an error.
 */
export type AccountStatus = 'idle' | 'loading' | 'ready' | 'error'

export type AccountContextValue = {
  status: AccountStatus
  profile: Profile | null
  preferences: Preferences | null
  locations: SavedLocation[]
  error: string | null
  refresh: () => Promise<void>
}

export const AccountContext = createContext<AccountContextValue | null>(null)
