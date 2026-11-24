-- ============================================================================
-- ClimaGuard — Phase 2 Stage 2
-- Account and personalization foundation.
--
-- WHAT THIS MIGRATION DOES
--   Creates three tables (profiles, user_preferences, monitored_locations),
--   boots them for new and existing auth users, and enforces ownership,
--   location limits and primary-location rules inside the database.
--
-- SECURITY MODEL (read before changing anything below)
--   * Row Level Security is enabled on all three tables and every policy is
--     scoped to `authenticated` and keyed on auth.uid(). RLS is the boundary:
--     the browser only ever holds the public anon key, so route guards and
--     client checks are UX, never security.
--   * Table privileges are granted explicitly instead of relying on Supabase's
--     broad defaults. RLS does not grant access on its own and privileges do
--     not apply policies; both layers are required.
--   * Privileged functions are SECURITY DEFINER with a fixed empty search_path
--     and fully-qualified object names, and have EXECUTE revoked from PUBLIC.
--   * No service-role key is referenced anywhere. Nothing here uses one.
--
-- SAFETY
--   * The whole file runs in one transaction: any error rolls everything back.
--   * Nothing is dropped, truncated or deleted. No existing row is overwritten.
--   * Re-running is safe: every object is created with IF NOT EXISTS,
--     CREATE OR REPLACE, or a guarded DROP ... IF EXISTS before CREATE.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. profiles — one row per authenticated user, the identity anchor.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default ''
    constraint profiles_display_name_length check (char_length(display_name) <= 80),
  user_mode text not null default 'personal'
    constraint profiles_user_mode_valid check (user_mode in ('personal', 'business')),
  business_name text
    constraint profiles_business_name_length check (char_length(business_name) <= 120),
  business_sector text
    constraint profiles_business_sector_length check (char_length(business_sector) <= 80),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. Rows are created only by the signup trigger; clients may read and update their own row and may never insert or delete one.';

-- ----------------------------------------------------------------------------
-- 2. user_preferences — one row per user, created alongside the profile.
-- ----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  unit_system text not null default 'metric'
    constraint user_preferences_unit_system_valid check (unit_system in ('metric', 'imperial')),
  hazard_interests text[] not null
    default array['flood', 'heat', 'storm', 'air_quality']::text[]
    constraint user_preferences_hazard_interests_valid check (
      hazard_interests <@ array[
        'flood', 'heat', 'storm', 'air_quality', 'drought', 'coastal'
      ]::text[]
      and array_position(hazard_interests, null::text) is null
    ),
  notify_email boolean not null default false,
  notify_in_app boolean not null default true,
  digest_frequency text not null default 'daily'
    constraint user_preferences_digest_frequency_valid
      check (digest_frequency in ('daily', 'weekly', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_preferences is
  'Per-user display and notification preferences. Storing preferences does not send anything: no delivery infrastructure exists.';

-- ----------------------------------------------------------------------------
-- 3. monitored_locations — the three supported markets only.
--    No coordinates, no addresses, no forecast data: city_key is the whole
--    location model, which is what makes fabricated places impossible.
-- ----------------------------------------------------------------------------
create table if not exists public.monitored_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  city_key text not null
    constraint monitored_locations_city_key_valid
      check (city_key in ('lagos', 'metro_manila', 'dhaka')),
  label text not null
    constraint monitored_locations_label_length check (char_length(label) between 1 and 80),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint monitored_locations_user_city_unique unique (user_id, city_key)
);

comment on table public.monitored_locations is
  'Locations a user follows. city_key is constrained to the supported markets; per-user caps are enforced by trigger, not by the UI.';

create index if not exists monitored_locations_user_id_idx
  on public.monitored_locations (user_id);

-- At most one primary location per user. A partial unique index makes two
-- primaries structurally impossible rather than merely discouraged.
create unique index if not exists monitored_locations_one_primary_per_user_idx
  on public.monitored_locations (user_id)
  where is_primary;

-- ----------------------------------------------------------------------------
-- 4. updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Signup bootstrap
--    SECURITY DEFINER + empty search_path so the function cannot be hijacked
--    through a caller-controlled search path. Every object is qualified.
--    ON CONFLICT DO NOTHING makes it idempotent: a retried signup or a
--    backfilled user is never overwritten.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  -- Signup metadata is user-controlled, so treat it as untrusted: trim it,
  -- ignore blanks, fall back to full_name, and finally to an empty string.
  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    ''
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(v_display_name, 80))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for accounts that already existed. Trigger functions only fire on
-- future inserts, so without this those users would have no profile at all.
-- ON CONFLICT DO NOTHING guarantees no existing profile or preference row is
-- modified.
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 6. Location caps: personal = 1, business = 5.
--
--    Concurrency: two simultaneous inserts would both read the same count and
--    both succeed. Taking SELECT ... FOR UPDATE on the owner's profile row
--    serialises all location writes for that user, so the second insert waits
--    and then sees the first one's row.
--
--    The function is SECURITY DEFINER so it can read the profile regardless of
--    RLS, which is why it re-checks ownership itself: it must never become a
--    way to write into another account.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_location_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_mode text;
  v_limit integer;
  v_count integer;
begin
  if v_uid is null or v_uid <> new.user_id then
    raise exception 'Cannot add a location for another user'
      using errcode = '42501';
  end if;

  select p.user_mode
    into v_mode
    from public.profiles p
   where p.id = new.user_id
     for update;

  if v_mode is null then
    raise exception 'No profile exists for this user'
      using errcode = '23503';
  end if;

  v_limit := case v_mode when 'business' then 5 else 1 end;

  select count(*)
    into v_count
    from public.monitored_locations l
   where l.user_id = new.user_id;

  if v_count >= v_limit then
    raise exception 'Location limit reached: % accounts may follow % location(s)',
      v_mode, v_limit
      using errcode = '23514';
  end if;

  -- A user's first location is always primary, so a personal account is never
  -- left with a location but no primary.
  if v_count = 0 then
    new.is_primary := true;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_location_limits() from public;

drop trigger if exists monitored_locations_enforce_limits on public.monitored_locations;
create trigger monitored_locations_enforce_limits
  before insert on public.monitored_locations
  for each row execute function public.enforce_location_limits();

-- ----------------------------------------------------------------------------
-- 7. Business to personal downgrade guard.
--
--    Concurrency: the BEFORE UPDATE trigger runs while the profile row is
--    already locked by the UPDATE itself, and the location-insert trigger locks
--    that same row before counting. The two therefore cannot interleave: a
--    concurrent insert either completed before this check or is blocked until
--    it finishes, so the count it sees is accurate.
-- ----------------------------------------------------------------------------
create or replace function public.guard_user_mode_downgrade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if new.user_mode = 'personal' and old.user_mode is distinct from 'personal' then
    select count(*)
      into v_count
      from public.monitored_locations l
     where l.user_id = new.id;

    if v_count > 1 then
      raise exception
        'Remove locations before switching to personal mode: % locations are followed',
        v_count
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_user_mode_downgrade() from public;

drop trigger if exists profiles_guard_mode_downgrade on public.profiles;
create trigger profiles_guard_mode_downgrade
  before update of user_mode on public.profiles
  for each row execute function public.guard_user_mode_downgrade();

-- ----------------------------------------------------------------------------
-- 8. set_primary_location — atomic primary switch.
--
--    SECURITY INVOKER as designed: it runs with the caller's privileges, so RLS
--    still applies and the function cannot exceed what the caller may already
--    do. That is satisfiable with the grants below —
--      * SELECT, UPDATE on monitored_locations  -> the two UPDATE statements
--      * SELECT, UPDATE on profiles             -> the FOR UPDATE row lock
--      * RLS "own rows" policies                -> every predicate matches
--    so there is no privilege conflict and no need for SECURITY DEFINER.
--
--    Locking the profile row first mirrors enforce_location_limits(), so
--    primary changes and inserts for one user serialise on the same row.
-- ----------------------------------------------------------------------------
create or replace function public.set_primary_location(p_location_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_locked_profile_id uuid;
  v_location_owner uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select p.id
    into v_locked_profile_id
    from public.profiles p
   where p.id = v_uid
     for update;

  if v_locked_profile_id is null then
    raise exception 'No profile exists for this user' using errcode = '42501';
  end if;

  select l.user_id
    into v_location_owner
    from public.monitored_locations l
   where l.id = p_location_id;

  if v_location_owner is null or v_location_owner <> v_uid then
    raise exception 'Location not found' using errcode = '42501';
  end if;

  -- Clear first so the partial unique index is never momentarily violated.
  update public.monitored_locations
     set is_primary = false
   where user_id = v_uid
     and is_primary
     and id <> p_location_id;

  update public.monitored_locations
     set is_primary = true
   where id = p_location_id
     and user_id = v_uid;
end;
$$;

revoke all on function public.set_primary_location(uuid) from public;
revoke all on function public.set_primary_location(uuid) from anon;
grant execute on function public.set_primary_location(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 9. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.monitored_locations enable row level security;

-- profiles: read and update your own row. No INSERT (the signup trigger owns
-- creation) and no DELETE (account deletion is out of scope for this phase).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- user_preferences: read, create and update your own row.
drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own on public.user_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_preferences_insert_own on public.user_preferences;
create policy user_preferences_insert_own on public.user_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_preferences_update_own on public.user_preferences;
create policy user_preferences_update_own on public.user_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- monitored_locations: full control over your own rows.
-- WITH CHECK on UPDATE pins user_id to the caller, so a row can never be
-- reassigned to another account.
drop policy if exists monitored_locations_select_own on public.monitored_locations;
create policy monitored_locations_select_own on public.monitored_locations
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists monitored_locations_insert_own on public.monitored_locations;
create policy monitored_locations_insert_own on public.monitored_locations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists monitored_locations_update_own on public.monitored_locations;
create policy monitored_locations_update_own on public.monitored_locations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists monitored_locations_delete_own on public.monitored_locations;
create policy monitored_locations_delete_own on public.monitored_locations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 10. Table privileges.
--
--     Supabase's defaults hand broad privileges to anon and authenticated, so
--     both are reset and then granted only what the design needs. anon gets
--     nothing at all: an unauthenticated request cannot reach these tables even
--     if a policy were later miswritten.
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;

revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

revoke all on public.user_preferences from anon, authenticated;
grant select, insert, update on public.user_preferences to authenticated;

revoke all on public.monitored_locations from anon, authenticated;
grant select, insert, update, delete on public.monitored_locations to authenticated;

commit;
