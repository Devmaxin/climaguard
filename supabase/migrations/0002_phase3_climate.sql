-- ============================================================================
-- ClimaGuard — Phase 3 Stage 1
-- Climate data foundation: ECMWF forecast storage.
--
-- WHAT THIS MIGRATION DOES
--   Creates two tables: `climate_forecasts` (public read-only forecast rows
--   written by the ingestion job) and `climate_ingest_log` (operational run
--   log, not readable by frontend users).
--
-- SECURITY MODEL
--   * RLS is enabled on both tables.
--   * `climate_forecasts` is SELECT-only for anon + authenticated. There is no
--     policy granting writes to either role, and the table privileges below
--     do not grant them either — both layers must allow an operation.
--   * `climate_ingest_log` has RLS enabled with no policies and no grants to
--     anon or authenticated, so frontend users cannot read operational logs
--     even to learn when ingestion failed. They observe that indirectly from
--     the forecast timestamps.
--   * Ingestion authenticates as service_role, which has BYPASSRLS. The
--     service-role key lives only in GitHub Actions secrets.
--
-- SAFETY
--   * One transaction: any error rolls everything back.
--   * Idempotent: every object is created with IF NOT EXISTS / guarded DROP.
--   * Does not touch `0001_phase2_accounts.sql` or any Phase 2 object.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. climate_forecasts — one row per city, variable, model run and valid time.
-- ----------------------------------------------------------------------------
create table if not exists public.climate_forecasts (
  id bigint generated always as identity primary key,
  city_key text not null
    constraint climate_forecasts_city_key_valid
    check (city_key in ('lagos', 'metro_manila', 'dhaka')),
  variable text not null
    constraint climate_forecasts_variable_valid
    check (variable in (
      'temperature_2m', 'wind_speed', 'wind_direction', 'precipitation', 'pressure_msl'
    )),
  value double precision not null
    -- Rejects NaN; PostgreSQL considers NaN equal to itself, so this check
    -- fails for NaN and passes for every real number.
    constraint climate_forecasts_value_finite
    check (value <> 'NaN'::double precision),
  unit text not null
    constraint climate_forecasts_unit_valid
    check (unit in ('degC', 'kmh', 'deg', 'mm', 'hPa')),
  -- The instant this forecast describes.
  valid_time timestamptz not null,
  -- The model run (initialisation time) this value came from. Part of the
  -- unique key so successive runs never overwrite each other's provenance.
  forecast_reference_time timestamptz not null,
  forecast_step integer not null
    constraint climate_forecasts_step_range
    check (forecast_step >= 0 and forecast_step <= 120),
  source text not null default 'ECMWF Open Data (IFS 0.25°)',
  source_licence text not null default 'CC BY 4.0',
  interpolation text not null default 'bilinear'
    constraint climate_forecasts_interpolation_valid
    check (interpolation in ('bilinear', 'nearest')),
  -- Set explicitly by the ingestion job on every upsert, so a re-ingested run
  -- carries the time it was actually refreshed rather than its first write.
  fetched_at timestamptz not null default now()
);

comment on table public.climate_forecasts is
  'Normalised ECMWF IFS Open Data forecasts for the launch cities. Written only by the GitHub Actions ingestion job (service_role), read-only for clients.';

create unique index if not exists climate_forecasts_unique_row
  on public.climate_forecasts (city_key, variable, forecast_reference_time, valid_time);

create index if not exists climate_forecasts_city_valid_idx
  on public.climate_forecasts (city_key, valid_time desc);

create index if not exists climate_forecasts_ref_idx
  on public.climate_forecasts (forecast_reference_time desc);

-- ----------------------------------------------------------------------------
-- 2. climate_ingest_log — one row per ingestion attempt.
-- ----------------------------------------------------------------------------
create table if not exists public.climate_ingest_log (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null
    constraint climate_ingest_log_status_valid
    check (status in ('success', 'skipped', 'failed')),
  forecast_reference_time timestamptz,
  rows_written integer,
  -- Sanitised by the ingestion job: exception type and message only, with
  -- credentials, auth headers and keyed URLs stripped before writing.
  error text
);

comment on table public.climate_ingest_log is
  'Operational log for the climate ingestion job. Service-role only: no grants and no RLS policies for anon or authenticated.';

create index if not exists climate_ingest_log_ref_idx
  on public.climate_ingest_log (forecast_reference_time desc, started_at desc);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.climate_forecasts enable row level security;
alter table public.climate_ingest_log enable row level security;

-- Forecasts are public reading material: they describe cities, not people.
drop policy if exists climate_forecasts_select_public on public.climate_forecasts;
create policy climate_forecasts_select_public on public.climate_forecasts
  for select to anon, authenticated
  using (true);

-- No policy on climate_ingest_log. Service_role bypasses RLS; every other
-- role is denied by the absence of a policy and the absence of a grant.

-- ----------------------------------------------------------------------------
-- 4. Table privileges.
--
--     Supabase's defaults hand broad privileges to anon and authenticated, so
--     both are reset and re-granted narrowly. RLS alone would not stop a
--     privileged write; these grants are the other half of the boundary.
-- ----------------------------------------------------------------------------
grant usage on schema public to anon;
grant usage on schema public to authenticated;

revoke all on public.climate_forecasts from anon, authenticated;
grant select on public.climate_forecasts to anon, authenticated;
grant all on public.climate_forecasts to service_role;

revoke all on public.climate_ingest_log from anon, authenticated;
grant all on public.climate_ingest_log to service_role;

-- The identity column's sequence must be usable by the ingestion role.
grant usage, select on all sequences in schema public to service_role;

commit;
