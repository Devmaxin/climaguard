import type { PostgrestError } from '@supabase/supabase-js'

import { requireSupabase } from '@/lib/supabase/client'
import type {
  CityKey,
  DigestFrequency,
  HazardInterest,
  UserMode,
} from '@/lib/supabase/database.types'

export type Profile = {
  id: string
  display_name: string
  user_mode: UserMode
  business_name: string | null
  business_sector: string | null
  onboarding_completed: boolean
}

export type Preferences = {
  hazard_interests: HazardInterest[]
  notify_email: boolean
  notify_in_app: boolean
  digest_frequency: DigestFrequency
}

export type SavedLocation = {
  id: string
  city_key: CityKey
  label: string
  is_primary: boolean
}

export class AccountError extends Error {
  /** True when the failure was a database rule (limit, duplicate) rather than transport. */
  readonly rule: boolean

  constructor(message: string, rule = false) {
    super(message)
    this.name = 'AccountError'
    this.rule = rule
  }
}

/**
 * Turns a database error into something a person can act on. Constraint text
 * names tables and columns, so it never reaches the UI verbatim.
 */
function describe(error: PostgrestError): AccountError {
  const message = error.message ?? ''

  if (message.includes('Location limit reached')) {
    return new AccountError('That many locations is beyond what this account type can follow.', true)
  }
  if (message.includes('Remove locations before switching')) {
    return new AccountError(
      'Remove the extra locations before switching to a personal account.',
      true,
    )
  }
  if (error.code === '23505') {
    return new AccountError('That location is already on your list.', true)
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    return new AccountError('Your session has expired. Sign in again to continue.', true)
  }
  if (error.code === '23514' || error.code === '23503') {
    return new AccountError('Some of those details are not accepted. Check them and try again.', true)
  }

  return new AccountError('We could not reach your account. Check your connection and try again.')
}

function fail(error: unknown): never {
  if (error instanceof AccountError) throw error
  throw new AccountError('We could not reach your account. Check your connection and try again.')
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await requireSupabase()
      .from('profiles')
      .select('id, display_name, user_mode, business_name, business_sector, onboarding_completed')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw describe(error)
    return data
  } catch (error) {
    fail(error)
  }
}

export async function fetchPreferences(userId: string): Promise<Preferences | null> {
  try {
    const { data, error } = await requireSupabase()
      .from('user_preferences')
      .select('hazard_interests, notify_email, notify_in_app, digest_frequency')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw describe(error)
    return data
  } catch (error) {
    fail(error)
  }
}

export async function fetchLocations(userId: string): Promise<SavedLocation[]> {
  try {
    const { data, error } = await requireSupabase()
      .from('monitored_locations')
      .select('id, city_key, label, is_primary')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw describe(error)
    return data ?? []
  } catch (error) {
    fail(error)
  }
}

async function updateProfileRow(
  userId: string,
  patch: {
    display_name?: string
    user_mode?: UserMode
    business_name?: string | null
    business_sector?: string | null
    onboarding_completed?: boolean
  },
): Promise<void> {
  try {
    const { data, error } = await requireSupabase()
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('id')

    if (error) throw describe(error)

    // The signup trigger creates this row. If it is missing, an update silently
    // touches nothing — surface that instead of reporting a phantom success.
    if (!data || data.length === 0) {
      throw new AccountError(
        'Your profile record is missing. Sign out and back in to recreate it.',
        true,
      )
    }
  } catch (error) {
    fail(error)
  }
}

/**
 * Switching to personal is only legal while at most one location is followed,
 * so extra locations are dropped first. The database would otherwise reject the
 * mode change with a constraint error the person cannot act on.
 */
export async function saveMode(userId: string, mode: UserMode): Promise<void> {
  if (mode === 'personal') {
    const locations = await fetchLocations(userId)

    if (locations.length > 1) {
      const keep = locations.find((location) => location.is_primary) ?? locations[0]
      const drop = locations.filter((location) => location.id !== keep.id)

      try {
        const { error } = await requireSupabase()
          .from('monitored_locations')
          .delete()
          .in(
            'id',
            drop.map((location) => location.id),
          )
          .eq('user_id', userId)

        if (error) throw describe(error)
      } catch (error) {
        fail(error)
      }
    }
  }

  await updateProfileRow(userId, { user_mode: mode })
}

export async function saveProfileDetails(
  userId: string,
  details: {
    displayName: string
    mode: UserMode
    businessName: string
    businessSector: string
  },
): Promise<void> {
  await updateProfileRow(userId, {
    display_name: details.displayName.trim(),
    business_name: details.mode === 'business' ? details.businessName.trim() || null : null,
    business_sector: details.mode === 'business' ? details.businessSector.trim() || null : null,
  })
}

/**
 * Brings the saved location set in line with the selection without ever
 * deleting a wanted location first. The sequence is:
 *
 * 1. Repurpose rows for deselected cities into wanted cities (UPDATE, count
 * unchanged, so the insert cap cannot reject an at-limit swap).
 * 2. Insert whatever wanted cities are still missing.
 * 3. Point the primary at the request via the RPC.
 * 4. Only then delete rows that are still not wanted.
 *
 * Every step only discards cities the user deselected, so a failure leaves
 * the wanted set intact-or-advanced and retrying converges instead of losing
 * data. Re-running the same selection is a no-op.
 */
export async function saveLocations(
  userId: string,
  selection: { cityKeys: CityKey[]; primary: CityKey | null; labelFor: (key: CityKey) => string },
): Promise<void> {
  try {
    const keys = [...new Set(selection.cityKeys)]
    const existing = await fetchLocations(userId)
    const wanted = new Set(keys)

    const removals = existing.filter((location) => !wanted.has(location.city_key))
    const have = new Set(existing.map((location) => location.city_key))
    const additions = keys.filter((key) => !have.has(key))

    // Pair deselected rows with wanted cities. UPDATE keeps the row count
    // identical, so a personal replace or a full business list never trips
    // the insert trigger's cap. Clearing is_primary here avoids even a
    // momentary two-primary violation; the RPC in step 3 restores it.
    const pairs = Math.min(removals.length, additions.length)
    for (let index = 0; index < pairs; index += 1) {
      const row = removals[index]
      const key = additions[index]
      const { error } = await requireSupabase()
        .from('monitored_locations')
        .update({ city_key: key, label: selection.labelFor(key), is_primary: false })
        .eq('id', row.id)
        .eq('user_id', userId)

      if (error) throw describe(error)
    }

    // Slots were freed by pairing or were already free, so the wanted set —
    // validated against the account cap before this call — fits the limit.
    const remaining = additions.slice(pairs)
    if (remaining.length > 0) {
      const { error } = await requireSupabase()
        .from('monitored_locations')
        .insert(
          remaining.map((key) => ({
            user_id: userId,
            city_key: key,
            label: selection.labelFor(key),
            // The trigger promotes the very first location to primary itself.
            is_primary: false,
          })),
        )

      if (error) throw describe(error)
    }

    // A single location is always the primary, even if the caller passed none.
    const effectivePrimary =
      selection.primary ?? (keys.length === 1 ? keys[0] : null)
    if (effectivePrimary) {
      const after = await fetchLocations(userId)
      const target = after.find((location) => location.city_key === effectivePrimary)

      if (!target) {
        throw new AccountError('That primary location was not saved. Try again.')
      }

      if (!target.is_primary) {
        const { error } = await requireSupabase().rpc('set_primary_location', {
          p_location_id: target.id,
        })

        if (error) throw describe(error)
      }
    }

    // The wanted set is fully established above; if this delete fails,
    // retrying only retries a delete.
    const leftover = removals.slice(pairs)
    if (leftover.length > 0) {
      const { error } = await requireSupabase()
        .from('monitored_locations')
        .delete()
        .in(
          'id',
          leftover.map((location) => location.id),
        )
        .eq('user_id', userId)

      if (error) throw describe(error)
    }
  } catch (error) {
    fail(error)
  }
}

export async function savePreferences(
  userId: string,
  preferences: Preferences,
): Promise<void> {
  try {
    const { error } = await requireSupabase()
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          hazard_interests: preferences.hazard_interests,
          notify_email: preferences.notify_email,
          notify_in_app: preferences.notify_in_app,
          digest_frequency: preferences.digest_frequency,
        },
        { onConflict: 'user_id' },
      )

    if (error) throw describe(error)
  } catch (error) {
    fail(error)
  }
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  await updateProfileRow(userId, { onboarding_completed: true })
}

/** Everything onboarding and the app shell need, fetched in one pass. */
export async function fetchAccount(userId: string): Promise<{
  profile: Profile | null
  preferences: Preferences | null
  locations: SavedLocation[]
}> {
  const [profile, preferences, locations] = await Promise.all([
    fetchProfile(userId),
    fetchPreferences(userId),
    fetchLocations(userId),
  ])

  return { profile, preferences, locations }
}
