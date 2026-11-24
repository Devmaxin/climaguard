export const MIN_PASSWORD_LENGTH = 8
export const MAX_DISPLAY_NAME_LENGTH = 80

// Deliberately loose: the browser and Supabase both validate more strictly, and
// an over-clever pattern here rejects addresses that actually work.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | null {
  const email = value.trim()

  if (!email) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email)) return 'That does not look like an email address.'

  return null
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Enter your password.'
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  return null
}

export function validateDisplayName(value: string): string | null {
  const name = value.trim()

  if (!name) return 'Enter a name so your briefing can be addressed to you.'
  if (name.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Keep this under ${MAX_DISPLAY_NAME_LENGTH} characters.`
  }

  return null
}

export function validateConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) return 'Re-enter your password.'
  if (password !== confirmation) return 'Those passwords do not match.'

  return null
}
