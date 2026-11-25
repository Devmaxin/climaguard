import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  AccountError,
  fetchAccount,
  type Preferences,
  type Profile,
  type SavedLocation,
} from '@/lib/account/account-api'
import {
  AccountContext,
  type AccountContextValue,
  type AccountStatus,
} from '@/lib/account/account-context'
import { useAuth } from '@/hooks/use-auth'

type LoadedAccount = {
  profile: Profile | null
  preferences: Preferences | null
  locations: SavedLocation[]
}

type AccountState = {
  // Whose account the fields below belong to. Rendering compares this against
  // the signed-in user instead of clearing state on sign-out.
  ownerId: string | null
  status: AccountStatus
  account: LoadedAccount
  error: string | null
}

const EMPTY_ACCOUNT: LoadedAccount = { profile: null, preferences: null, locations: [] }

const IDLE_STATE: AccountState = {
  ownerId: null,
  status: 'idle',
  account: EMPTY_ACCOUNT,
  error: null,
}

function AccountProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, session } = useAuth()
  const userId = session?.user.id ?? null

  const [state, setState] = useState<AccountState>(IDLE_STATE)

  // The id whose account is currently in state. Re-fetching only when it
  // changes keeps route guards from querying the profile on every render.
  const loadedIdRef = useRef<string | null>(null)
  const requestRef = useRef(0)

  const load = useCallback(async (id: string) => {
    const request = ++requestRef.current
    setState({ ownerId: id, status: 'loading', account: EMPTY_ACCOUNT, error: null })

    try {
      const account = await fetchAccount(id)
      if (requestRef.current !== request) return

      loadedIdRef.current = id
      setState({ ownerId: id, status: 'ready', account, error: null })
    } catch (error) {
      if (requestRef.current !== request) return

      loadedIdRef.current = null
      setState({
        ownerId: id,
        status: 'error',
        account: EMPTY_ACCOUNT,
        error:
          error instanceof AccountError
            ? error.message
            : 'We could not load your account. Try again.',
      })
    }
  }, [])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) {
      requestRef.current += 1
      loadedIdRef.current = null
      return
    }

    if (loadedIdRef.current === userId) return
    void load(userId)
  }, [authStatus, userId, load])

  const refresh = useCallback(async () => {
    if (!userId) return
    await load(userId)
  }, [userId, load])

  // Anything belonging to a signed-out or different account reads as idle, so
  // a stale account never leaks into the guards for a frame.
  const current = authStatus === 'authenticated' && userId === state.ownerId ? state : IDLE_STATE

  const value = useMemo<AccountContextValue>(
    () => ({
      status: current.status,
      profile: current.account.profile,
      preferences: current.account.preferences,
      locations: current.account.locations,
      error: current.error,
      refresh,
    }),
    [current, refresh],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export { AccountProvider }
