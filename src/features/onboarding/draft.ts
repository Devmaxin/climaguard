import type { Preferences, Profile, SavedLocation } from '@/lib/account/account-api'
import type { CityKey, DigestFrequency, HazardInterest, UserMode } from '@/lib/supabase/database.types'

export const MAX_DISPLAY_NAME = 80
export const MAX_BUSINESS_NAME = 120
export const MAX_BUSINESS_SECTOR = 80

export const PERSONAL_LOCATION_LIMIT = 1
export const BUSINESS_LOCATION_LIMIT = 5

export const stepOrder = ['mode', 'profile', 'location', 'preferences', 'review'] as const
export type OnboardingStep = (typeof stepOrder)[number]

export type OnboardingDraft = {
  mode: UserMode
  displayName: string
  businessName: string
  businessSector: string
  cityKeys: CityKey[]
  primary: CityKey | null
  hazards: HazardInterest[]
  notifyInApp: boolean
  notifyEmail: boolean
  digest: DigestFrequency
}

export type FieldErrors = Record<string, string>

/** Matches the column defaults in migration 0001. */
const defaultHazards: HazardInterest[] = ['flood', 'heat', 'storm', 'air_quality']

export function createDraft(seed?: {
  profile: Profile | null
  preferences: Preferences | null
  locations: SavedLocation[]
}): OnboardingDraft {
  const profile = seed?.profile ?? null
  const preferences = seed?.preferences ?? null
  const locations = seed?.locations ?? []

  const primary = locations.find((location) => location.is_primary)?.city_key ?? null

  return {
    mode: profile?.user_mode ?? 'personal',
    displayName: profile?.display_name ?? '',
    businessName: profile?.business_name ?? '',
    businessSector: profile?.business_sector ?? '',
    cityKeys: locations.map((location) => location.city_key),
    primary: primary ?? locations[0]?.city_key ?? null,
    hazards: preferences?.hazard_interests?.length
      ? preferences.hazard_interests
      : defaultHazards,
    notifyInApp: preferences?.notify_in_app ?? true,
    notifyEmail: preferences?.notify_email ?? false,
    digest: preferences?.digest_frequency ?? 'daily',
  }
}

export function locationLimit(mode: UserMode): number {
  return mode === 'business' ? BUSINESS_LOCATION_LIMIT : PERSONAL_LOCATION_LIMIT
}

export function validateProfile(draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {}
  const name = draft.displayName.trim()

  if (!name) {
    errors.displayName = 'Enter the name you want us to use.'
  } else if (name.length > MAX_DISPLAY_NAME) {
    errors.displayName = `Keep this under ${MAX_DISPLAY_NAME} characters.`
  }

  if (draft.mode === 'business') {
    const business = draft.businessName.trim()
    const sector = draft.businessSector.trim()

    if (!business) {
      errors.businessName = 'Enter your business name.'
    } else if (business.length > MAX_BUSINESS_NAME) {
      errors.businessName = `Keep this under ${MAX_BUSINESS_NAME} characters.`
    }

    if (!sector) {
      errors.businessSector = 'Enter the sector you operate in.'
    } else if (sector.length > MAX_BUSINESS_SECTOR) {
      errors.businessSector = `Keep this under ${MAX_BUSINESS_SECTOR} characters.`
    }
  }

  return errors
}

export function validateLocations(draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {}
  const limit = locationLimit(draft.mode)

  if (draft.cityKeys.length === 0) {
    errors.cities =
      draft.mode === 'personal'
        ? 'Choose the one location you want to follow.'
        : 'Choose at least one location to follow.'
  } else if (draft.cityKeys.length > limit) {
    errors.cities = `Choose up to ${limit} locations.`
  }

  if (draft.primary && !draft.cityKeys.includes(draft.primary)) {
    errors.primary = 'Pick a primary location from the ones you selected.'
  }

  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function toggleCity(
  draft: OnboardingDraft,
  key: CityKey,
): OnboardingDraft {
  const selected = draft.cityKeys.includes(key)

  if (selected) {
    const cityKeys = draft.cityKeys.filter((entry) => entry !== key)
    return {
      ...draft,
      cityKeys,
      primary: draft.primary === key ? (cityKeys[0] ?? null) : draft.primary,
    }
  }

  if (draft.cityKeys.length >= locationLimit(draft.mode)) {
    // A personal account swaps its single location instead of refusing the tap.
    if (draft.mode === 'personal') {
      return { ...draft, cityKeys: [key], primary: key }
    }

    return draft
  }

  const cityKeys = [...draft.cityKeys, key]
  return { ...draft, cityKeys, primary: draft.primary ?? key }
}

export function toggleHazard(
  draft: OnboardingDraft,
  hazard: HazardInterest,
): OnboardingDraft {
  const hazards = draft.hazards.includes(hazard)
    ? draft.hazards.filter((entry) => entry !== hazard)
    : [...draft.hazards, hazard]

  return { ...draft, hazards }
}
