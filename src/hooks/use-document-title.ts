import { useEffect } from 'react'

const SITE_NAME = 'ClimaGuard'

/**
 * Keeps the document title in sync with the active route.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  }, [title])
}
