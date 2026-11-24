import { useContext } from 'react'

import { ThemeContext, type Theme } from '@/lib/theme-context'

/**
 * Hook to access the current theme and toggle it.
 */
export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

export type { Theme }
