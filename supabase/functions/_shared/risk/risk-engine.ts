import type {
  CityKey,
  ClimateVariable,
  HazardInterest,
} from '../../../../src/lib/supabase/database.types.ts'
import { DEFAULT_THRESHOLDS, windTierFor, type RiskThresholds } from './thresholds.ts'
import {
  HAZARD_ORDER,
  type ClimateSnapshot,
  type HazardVerdict,
  type RiskAssessment,
  type RiskAssessmentStatus,
  type RiskEvidence,
  type UnclassifiedReason,
  type VariableCoverage,
} from './types.ts'

export type AssessOptions = {
  /** Hazards to report on. Defaults to every hazard the product knows. */
  hazards?: HazardInterest[]
  /** Reference instant for the forward window. Defaults to now. */
  now?: Date
  thresholds?: RiskThresholds
}

type Series = { validTime: number; value: number }[]

const EMPTY_COVERAGE: VariableCoverage = { observed: 0, expected: 0 }

function inWindow(points: ClimateSnapshot['points'], variable: ClimateVariable, from: number, to: number): Series {
  return points
    .filter((point) => point.variable === variable)
    .map((point) => ({ validTime: Date.parse(point.validTime), value: point.value }))
    .filter(
      (point) =>
        Number.isFinite(point.validTime) &&
        Number.isFinite(point.value) &&
        point.validTime >= from &&
        point.validTime <= to,
    )
    .sort((a, b) => a.validTime - b.validTime)
}

function maxOf(series: Series): number | null {
  if (series.length === 0) return null
  return series.reduce((best, point) => (point.value > best ? point.value : best), series[0].value)
}

function minOf(series: Series): number | null {
  if (series.length === 0) return null
  return series.reduce((best, point) => (point.value < best ? point.value : best), series[0].value)
}

function sumOf(series: Series): number | null {
  if (series.length === 0) return null
  return series.reduce((total, point) => total + point.value, 0)
}

function trendOf(series: Series): number | null {
  if (series.length < 2) return null
  return series[series.length - 1].value - series[0].value
}

function coverageOf(series: Series, expected: number): VariableCoverage {
  return { observed: series.length, expected }
}

/**
 * A model run can legitimately be referenced a little ahead of the clock we
 * happen to read, but a reference time in the future means the stored run
 * cannot be trusted to describe the next window.
 */
const REFERENCE_FUTURE_TOLERANCE_MS = 60 * 60 * 1000

function statusOf(
  snapshot: ClimateSnapshot | null,
  coverage: Partial<Record<ClimateVariable, VariableCoverage>>,
  now: number,
  thresholds: RiskThresholds,
): RiskAssessmentStatus {
  if (!snapshot || snapshot.points.length === 0) return 'no-data'

  // Freshness is the age of the model run itself, never the age of the last
  // write: re-upserting an old cycle must not make it look current, and a
  // reference that is missing, unparseable or in the future is not fresh
  // either. Every case is `stale`, so no classification is emitted from it.
  const reference = Date.parse(snapshot.referenceTime)
  if (!Number.isFinite(reference)) return 'stale'
  if (reference - now > REFERENCE_FUTURE_TOLERANCE_MS) return 'stale'
  if (now - reference > thresholds.staleAfterHours * 60 * 60 * 1000) return 'stale'

  // Only the variables a verdict depends on decide completeness.
  const required: ClimateVariable[] = ['temperature_2m', 'wind_speed', 'precipitation']
  const thin = required.some((variable) => {
    const entry = coverage[variable] ?? EMPTY_COVERAGE
    return entry.observed < entry.expected
  })

  return thin ? 'incomplete' : 'ready'
}

function unclassified(hazard: HazardInterest, reason: UnclassifiedReason, detail: string): HazardVerdict {
  return { kind: 'unclassified', hazard, reason, detail }
}

function assessStorm(
  status: RiskAssessmentStatus,
  evidence: RiskEvidence,
  thresholds: RiskThresholds,
): HazardVerdict {
  const source = thresholds.wind.source

  if (status === 'stale') {
    return unclassified('storm', 'stale-data', 'The stored forecast is stale, so no wind tier is reported.')
  }

  const coverage = evidence.coverage.wind_speed ?? EMPTY_COVERAGE

  if (evidence.maxWindSpeedKmh === null) {
    return unclassified('storm', 'missing-data', 'No wind speed samples fall inside the assessment window.')
  }

  if (coverage.observed < coverage.expected) {
    return unclassified(
      'storm',
      'missing-data',
      `Only ${coverage.observed} of ${coverage.expected} wind samples fall inside the window, which is too few to characterise a maximum.`,
    )
  }

  const tier = windTierFor(evidence.maxWindSpeedKmh, thresholds)
  const lowest = thresholds.wind.tiers[0]

  if (!tier || tier.beaufort < thresholds.wind.notableFromBeaufort) {
    return {
      kind: 'below-threshold',
      hazard: 'storm',
      observedKmh: evidence.maxWindSpeedKmh,
      thresholdKmh: lowest.minKmh,
      source,
    }
  }

  return {
    kind: 'classified',
    hazard: 'storm',
    severityId: tier.id,
    beaufort: tier.beaufort,
    label: tier.label,
    observedKmh: evidence.maxWindSpeedKmh,
    thresholdKmh: tier.minKmh,
    source,
  }
}

/**
 * Hazards with no published threshold applicable to the ingested variables.
 * The engine reports the evidence and declines to classify.
 */
function assessUnsupported(hazard: HazardInterest): HazardVerdict {
  switch (hazard) {
    case 'heat':
      return unclassified(
        'heat',
        'no-cited-threshold',
        'Temperature alone cannot establish heat stress: a heat index or UTCI also needs humidity, radiation and mean radiant temperature, and a heat wave needs a climatological normal. None are ingested.',
      )
    case 'flood':
      return unclassified(
        'flood',
        'no-cited-threshold',
        'Rainfall alone does not determine flooding. It also depends on catchment, drainage, antecedent soil moisture and tide or storm-surge context, which are not ingested.',
      )
    case 'air_quality':
    case 'drought':
    case 'coastal':
      return unclassified(
        hazard,
        'not-in-scope',
        'This build ingests no data source for this hazard, so nothing is assessed.',
      )
    default:
      return unclassified(hazard, 'not-in-scope', 'No assessment is defined for this hazard.')
  }
}

/**
 * Deterministic assessment of one city's stored forecast. Pure: it reads
 * nothing but its arguments, and it never calls a model, the network or the
 * clock beyond the `now` it is given.
 *
 * Every classification is gated on three things — fresh data, adequate
 * coverage, and a published threshold. When any is missing the verdict says so
 * instead of guessing.
 */
export function assessRisk(
  cityKey: CityKey,
  snapshot: ClimateSnapshot | null,
  options: AssessOptions = {},
): RiskAssessment {
  const thresholds = options.thresholds ?? DEFAULT_THRESHOLDS
  const hazards = options.hazards ?? HAZARD_ORDER
  const now = (options.now ?? new Date()).getTime()
  const windowEnd = now + thresholds.windowHours * 60 * 60 * 1000
  const expected = thresholds.windowHours / thresholds.stepHours

  const points = snapshot?.points ?? []
  const temperature = inWindow(points, 'temperature_2m', now, windowEnd)
  const windSpeed = inWindow(points, 'wind_speed', now, windowEnd)
  const windDirection = inWindow(points, 'wind_direction', now, windowEnd)
  const precipitation = inWindow(points, 'precipitation', now, windowEnd)
  const pressure = inWindow(points, 'pressure_msl', now, windowEnd)

  const evidence: RiskEvidence = {
    windowHours: thresholds.windowHours,
    windowStart: new Date(now).toISOString(),
    windowEnd: new Date(windowEnd).toISOString(),
    maxTemperatureC: maxOf(temperature),
    minTemperatureC: minOf(temperature),
    maxWindSpeedKmh: maxOf(windSpeed),
    windDirectionDeg: windDirection.length > 0 ? windDirection[0].value : null,
    precipitationTotalMm: sumOf(precipitation),
    temperatureTrendC: trendOf(temperature),
    windSpeedTrendKmh: trendOf(windSpeed),
    pressureTrendHpa: trendOf(pressure),
    coverage: {
      temperature_2m: coverageOf(temperature, expected),
      wind_speed: coverageOf(windSpeed, expected),
      wind_direction: coverageOf(windDirection, expected),
      precipitation: coverageOf(precipitation, expected),
      pressure_msl: coverageOf(pressure, expected),
    },
  }

  const status = statusOf(snapshot, evidence.coverage, now, thresholds)

  const verdicts: Partial<Record<HazardInterest, HazardVerdict>> = {}
  for (const hazard of hazards) {
    verdicts[hazard] =
      hazard === 'storm' ? assessStorm(status, evidence, thresholds) : assessUnsupported(hazard)
  }

  return {
    cityKey,
    status,
    forecastReferenceTime: snapshot?.referenceTime ?? null,
    fetchedAt: snapshot?.fetchedAt ?? null,
    source: snapshot?.source ?? null,
    licence: snapshot?.licence ?? null,
    evidence,
    verdicts,
  }
}
