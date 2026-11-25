import { useContext } from 'react'

import { AccountContext, type AccountContextValue } from '@/lib/account/account-context'

function useAccount(): AccountContextValue {
  const context = useContext(AccountContext)

  if (!context) {
    throw new Error('useAccount must be used inside an AccountProvider.')
  }

  return context
}

export { useAccount }
