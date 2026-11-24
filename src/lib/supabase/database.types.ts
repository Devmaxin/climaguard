/**
 * Hand-written shape of the ClimaGuard schema.
 *
 * This mirrors `supabase/migrations/0001_phase2_accounts.sql` and must be kept
 * in step with it: the migration is the source of truth, this file only gives
 * the client type safety. No table here exists until that migration is applied.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserMode = 'personal' | 'business'
export type CityKey = 'lagos' | 'metro-manila' | 'dhaka'
export type UnitSystem = 'metric' | 'imperial'
export type DigestFrequency = 'daily' | 'weekly' | 'off'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          user_mode: UserMode
          business_name: string | null
          business_sector: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string
          user_mode?: UserMode
          business_name?: string | null
          business_sector?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          user_mode?: UserMode
          business_name?: string | null
          business_sector?: string | null
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          user_id: string
          unit_system: UnitSystem
          hazard_interests: string[]
          notify_email: boolean
          notify_in_app: boolean
          digest_frequency: DigestFrequency
          updated_at: string
        }
        Insert: {
          user_id: string
          unit_system?: UnitSystem
          hazard_interests?: string[]
          notify_email?: boolean
          notify_in_app?: boolean
          digest_frequency?: DigestFrequency
          updated_at?: string
        }
        Update: {
          unit_system?: UnitSystem
          hazard_interests?: string[]
          notify_email?: boolean
          notify_in_app?: boolean
          digest_frequency?: DigestFrequency
          updated_at?: string
        }
        Relationships: []
      }
      monitored_locations: {
        Row: {
          id: string
          user_id: string
          city_key: CityKey
          label: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          city_key: CityKey
          label: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          city_key?: CityKey
          label?: string
          is_primary?: boolean
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      set_primary_location: {
        Args: { p_location_id: string }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
