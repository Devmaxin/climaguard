import { closestValidPoint, selectNewestRun } from '@/lib/climate/snapshot'
import { requireSupabase } from '@/lib/supabase/client'
import type {
  CityKey,
  ClimateUnit,
  ClimateVariable,
} from '@/lib/supabase/database.types'

export type ClimatePoint = {
  variable: ClimateVariable
  unit: ClimateUnit
  value: number
  validTime: string
  forecastStep: number
}

export type ClimateSnapshot = {
  cityKey: CityKey
  referenceTime: string
  fetchedAt: string
  source: string
  licence: string
  points: ClimatePoint[]
}

/**
 * A forecast is treated as stale once its model run is older than this. ECMWF
 * runs every six hours and publishes 7-9 hours later, so a healthy installation
 * is never anywhere near twelve hours behind.
 *
 * The age is measured from the model run's reference time, not from the last
 * ingest: re-storing an old cycle refreshes `fetched_at` and must not make that
 * run look current.
 */
export const STALE_AFTER_HOURS = 12

/** Mirrors the edge function's tolerance for a reference time slightly ahead. */
const REFERENCE_FUTURE_TOLERANCE_MS = 60 * 60 * 1000

export class ClimateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClimateError'
  }
}

/**
 * True when a stored run cannot be trusted as current: its reference time is
 * unparseable, in the future, or older than `STALE_AFTER_HOURS`.
 */
export function isStale(referenceTime: string, now: number = Date.now()): boolean {
  const reference = Date.parse(referenceTime)

  if (Number.isNaN(reference)) return true
  if (reference - now > REFERENCE_FUTURE_TOLERANCE_MS) return true

  return now - reference > STALE_AFTER_HOURS * 60 * 60 * 1000
}

type ForecastRow = {
  variable: ClimateVariable
  unit: ClimateUnit
  value: number
  valid_time: string
  forecast_step: number
  forecast_reference_time: string
  fetched_at: string
  source: string
  source_licence: string
}

/**
 * Reads the newest stored model run for one city. Returns null when nothing
 * has been ingested yet — the caller renders an honest "no data" state rather
 * than inventing a forecast.
 */
export async function fetchClimateSnapshot(cityKey: CityKey): Promise<ClimateSnapshot | null> {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('climate_forecasts')
    .select(
      'variable, unit, value, valid_time, forecast_step, forecast_reference_time, fetched_at, source, source_licence',
    )
    .eq('city_key', cityKey)
    .order('forecast_reference_time', { ascending: false })
    .order('valid_time', { ascending: true })
    .limit(2000)

  if (error) {
    throw new ClimateError(
      error.code === '42501' || error.code === 'PGRST301'
        ? 'Forecast data is not readable right now. Try again shortly.'
        : 'Forecast data could not be loaded.',
    )
  }

  const rows = (data ?? []) as ForecastRow[]

  const latestRun = selectNewestRun(rows)
  if (!latestRun) return null

  const { referenceTime, rows: latest } = latestRun

  return {
    cityKey,
    referenceTime,
    fetchedAt: latest[0].fetched_at,
    source: latest[0].source,
    licence: latest[0].source_licence,
    points: latest.map((row) => ({
      variable: row.variable,
      unit: row.unit,
      value: row.value,
      validTime: row.valid_time,
      forecastStep: row.forecast_step,
    })),
  }
}

/** The point for one variable whose valid time is closest to `at`. */
export function closestPoint(
  points: ClimatePoint[],
  variable: ClimateVariable,
  at: Date = new Date(),
): ClimatePoint | null {
  return closestValidPoint(points, variable, at.getTime())
}

/** The series for one variable, ordered by valid time, limited to a window. */
export function seriesFrom(
  points: ClimatePoint[],
  variable: ClimateVariable,
  from: Date = new Date(),
): ClimatePoint[] {
  return points
    .filter((point) => point.variable === variable && Date.parse(point.validTime) >= from.getTime())
    .sort((a, b) => Date.parse(a.validTime) - Date.parse(b.validTime))
}
