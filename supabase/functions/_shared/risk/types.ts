import type {
  CityKey,
  ClimateUnit,
  ClimateVariable,
  HazardInterest,
} from '../../../../src/lib/supabase/database.types.ts'

/**
 * Structural mirror of the forecast shapes in `src/lib/climate/climate-api.ts`.
 *
 * They are restated here — types only — because importing that module, even
 * with `import type`, makes a type checker load it, and it imports the browser
 * Supabase client, which reads `import.meta.env`. Deno has no such object, so
 * the edge function's type check failed on a file that never runs there.
 *
 * The app can still pass its own snapshots in: these are structurally
 * identical, so assignment works in both directions without a cast.
 */
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

export const HAZARD_ORDER: HazardInterest[] = [
  'heat',
  'flood',
  'storm',
  'air_quality',
  'drought',
  'coastal',
]

/**
 * `ready` — the window is fully covered by fresh data.
 * `incomplete` — fresh, but at least one input variable has fewer samples in
 *   the window than the data grid implies. Evidence is still reported; any
 *   classification that depends on the thin variable is withheld.
 * `stale` — the stored run is older than `staleAfterHours`. Evidence is
 *   reported as historical, and no classification is emitted.
 * `no-data` — nothing has been ingested for this city.
 */
export type RiskAssessmentStatus = 'ready' | 'incomplete' | 'stale' | 'no-data'

export type UnclassifiedReason =
  /** No published standard fixes a threshold for this hazard on this data. */
  | 'no-cited-threshold'
  /** The variable the hazard depends on is missing or under-sampled. */
  | 'missing-data'
  /** The stored run is stale. */
  | 'stale-data'
  /** This build ingests no data source for the hazard at all. */
  | 'not-in-scope'

export type HazardVerdict =
  | {
      kind: 'classified'
      hazard: HazardInterest
      severityId: string
      beaufort: number
      label: string
      observedKmh: number
      thresholdKmh: number
      source: string
    }
  | {
      kind: 'below-threshold'
      hazard: HazardInterest
      observedKmh: number
      thresholdKmh: number
      source: string
    }
  | {
      kind: 'unclassified'
      hazard: HazardInterest
      reason: UnclassifiedReason
      detail: string
    }

export type VariableCoverage = {
  /** Samples inside the assessment window. */
  observed: number
  /** Samples the window should contain at the stored step interval. */
  expected: number
}

/**
 * Everything the engine measured, over the forward window only. A `null`
 * figure means the underlying series was absent or too short to support it —
 * never that the value was zero.
 */
export type RiskEvidence = {
  windowHours: number
  windowStart: string
  windowEnd: string
  maxTemperatureC: number | null
  minTemperatureC: number | null
  maxWindSpeedKmh: number | null
  windDirectionDeg: number | null
  /** Sum of the precipitation intervals that end inside the window. */
  precipitationTotalMm: number | null
  /** Last minus first sample inside the window; null with fewer than 2. */
  temperatureTrendC: number | null
  windSpeedTrendKmh: number | null
  pressureTrendHpa: number | null
  coverage: Partial<Record<ClimateVariable, VariableCoverage>>
}

export type RiskAssessment = {
  cityKey: CityKey
  status: RiskAssessmentStatus
  forecastReferenceTime: string | null
  fetchedAt: string | null
  source: string | null
  licence: string | null
  evidence: RiskEvidence
  verdicts: Partial<Record<HazardInterest, HazardVerdict>>
}
