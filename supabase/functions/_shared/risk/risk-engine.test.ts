import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ClimateUnit, ClimateVariable } from '../../../../src/lib/supabase/database.types.ts'
import { assessRisk } from './risk-engine.ts'
import { DEFAULT_THRESHOLDS } from './thresholds.ts'
import type { ClimatePoint, ClimateSnapshot } from './types.ts'

const NOW = new Date('2026-11-25T11:00:00.000Z')
const HOUR = 60 * 60 * 1000

const UNITS: Record<ClimateVariable, ClimateUnit> = {
  temperature_2m: 'degC',
  wind_speed: 'kmh',
  wind_direction: 'deg',
  precipitation: 'mm',
  pressure_msl: 'hPa',
}

/** A point `hourOffset` hours from NOW, so the extras land just outside the window. */
function point(
  variable: ClimateVariable,
  value: number,
  hourOffset: number,
  step = Math.max(hourOffset, 0),
): ClimatePoint {
  return {
    variable,
    unit: UNITS[variable],
    value,
    validTime: new Date(NOW.getTime() + hourOffset * HOUR).toISOString(),
    forecastStep: step,
  }
}

/** Eight 3-hourly samples covering the default 24-hour window. */
function everyThreeHours(variable: ClimateVariable, value: number | number[]): ClimatePoint[] {
  const values = Array.isArray(value) ? value : new Array(8).fill(value)
  return values.map((sample, index) => point(variable, sample, (index + 1) * 3))
}

function snapshot(overrides: Partial<ClimateSnapshot> = {}): ClimateSnapshot {
  return {
    cityKey: 'lagos',
    referenceTime: '2026-11-25T00:00:00.000Z',
    fetchedAt: '2026-11-25T10:00:00.000Z',
    source: 'ECMWF Open Data (IFS 0.25°)',
    licence: 'CC BY 4.0',
    points: [
      ...everyThreeHours('temperature_2m', [26, 28, 30, 33, 31, 29, 27, 25]),
      ...everyThreeHours('wind_speed', 15),
      ...everyThreeHours('wind_direction', 200),
      ...everyThreeHours('precipitation', [0.2, 0, 1.4, 2.6, 0.8, 0, 0.4, 0.1]),
      ...everyThreeHours('pressure_msl', [1010, 1009, 1008, 1007, 1006, 1005, 1005, 1004]),
    ],
    ...overrides,
  }
}

describe('evidence', () => {
  it('computes maxima, the 24-hour rainfall total and trends', () => {
    const assessment = assessRisk('lagos', snapshot(), { now: NOW })
    const { evidence } = assessment

    assert.equal(evidence.maxTemperatureC, 33)
    assert.equal(evidence.minTemperatureC, 25)
    assert.equal(evidence.maxWindSpeedKmh, 15)
    assert.equal(evidence.windDirectionDeg, 200)
    assert.ok(Math.abs((evidence.precipitationTotalMm ?? 0) - 5.5) < 1e-9)
    assert.equal(evidence.temperatureTrendC, -1)
    assert.equal(evidence.pressureTrendHpa, -6)
    assert.equal(evidence.windSpeedTrendKmh, 0)
    assert.equal(assessment.status, 'ready')
  })

  it('ignores samples outside the forward window and in the past', () => {
    const withExtras = snapshot({
      points: [
        ...snapshot().points,
        point('precipitation', 50, -3, 0),
        point('precipitation', 50, 27),
        point('wind_speed', 140, 30),
        point('temperature_2m', 45, 36, 12),
      ],
    })

    const assessment = assessRisk('lagos', withExtras, { now: NOW })

    assert.equal(assessment.evidence.maxWindSpeedKmh, 15)
    assert.equal(assessment.evidence.maxTemperatureC, 33)
    assert.ok(Math.abs((assessment.evidence.precipitationTotalMm ?? 0) - 5.5) < 1e-9)
  })

  it('reports null rather than zero for absent series', () => {
    const assessment = assessRisk('lagos', snapshot({ points: [] }), { now: NOW })

    assert.equal(assessment.evidence.maxWindSpeedKmh, null)
    assert.equal(assessment.evidence.precipitationTotalMm, null)
    assert.equal(assessment.evidence.pressureTrendHpa, null)
  })
})

describe('status', () => {
  it('is no-data when nothing was ingested', () => {
    const assessment = assessRisk('dhaka', null, { now: NOW })

    assert.equal(assessment.status, 'no-data')
    assert.equal(assessment.forecastReferenceTime, null)
    assert.equal(assessment.verdicts.storm?.kind, 'unclassified')
    assert.equal(
      assessment.verdicts.storm?.kind === 'unclassified' ? assessment.verdicts.storm.reason : null,
      'missing-data',
    )
  })

  it('is stale when the stored run is older than the threshold', () => {
    const staleAt = new Date(NOW.getTime() - 20 * HOUR).toISOString()
    const assessment = assessRisk('lagos', snapshot({ referenceTime: staleAt }), { now: NOW })

    assert.equal(assessment.status, 'stale')
  })

  it('is incomplete when a required variable is missing', () => {
    const points = snapshot().points.filter((entry) => entry.variable !== 'wind_speed')
    const assessment = assessRisk('lagos', snapshot({ points }), { now: NOW })

    assert.equal(assessment.status, 'incomplete')
    assert.deepEqual(assessment.evidence.coverage.wind_speed, { observed: 0, expected: 8 })
  })

  it('is incomplete when a required variable is under-sampled', () => {
    const points = snapshot().points.filter(
      (entry) => !(entry.variable === 'precipitation' && entry.forecastStep > 6),
    )
    const assessment = assessRisk('lagos', snapshot({ points }), { now: NOW })

    assert.equal(assessment.status, 'incomplete')
    assert.deepEqual(assessment.evidence.coverage.precipitation, { observed: 2, expected: 8 })
  })
})

describe('freshness', () => {
  const gale = [
    ...snapshot().points.filter((entry) => entry.variable !== 'wind_speed'),
    ...everyThreeHours('wind_speed', 70),
  ]

  it('is ready when the model run itself is recent', () => {
    const assessment = assessRisk('lagos', snapshot(), { now: NOW })

    assert.equal(assessment.status, 'ready')
    assert.equal(assessment.forecastReferenceTime, '2026-11-25T00:00:00.000Z')
  })

  it('stays ready when a fresh run was fetched long ago', () => {
    const staleWrite = new Date(NOW.getTime() - 40 * HOUR).toISOString()
    const assessment = assessRisk('lagos', snapshot({ fetchedAt: staleWrite }), { now: NOW })

    assert.equal(assessment.status, 'ready')
  })

  it('is stale when an old run is re-upserted with a fresh write time', () => {
    const oldRun = new Date(NOW.getTime() - 20 * HOUR).toISOString()
    const assessment = assessRisk(
      'lagos',
      snapshot({ referenceTime: oldRun, fetchedAt: NOW.toISOString() }),
      { now: NOW },
    )

    assert.equal(assessment.status, 'stale')
  })

  it('withholds a classification for a re-upserted old run', () => {
    const oldRun = new Date(NOW.getTime() - 20 * HOUR).toISOString()
    const verdict = assessRisk(
      'lagos',
      snapshot({ points: gale, referenceTime: oldRun, fetchedAt: NOW.toISOString() }),
      { now: NOW },
    ).verdicts.storm

    assert.equal(verdict?.kind, 'unclassified')
    assert.equal(verdict?.kind === 'unclassified' ? verdict.reason : null, 'stale-data')
  })

  it('is stale when the run is referenced in the future', () => {
    const future = new Date(NOW.getTime() + 6 * HOUR).toISOString()
    const assessment = assessRisk('lagos', snapshot({ referenceTime: future }), { now: NOW })

    assert.equal(assessment.status, 'stale')
    assert.equal(assessment.verdicts.storm?.kind, 'unclassified')
  })

  it('is stale when the reference time cannot be parsed', () => {
    const assessment = assessRisk('lagos', snapshot({ referenceTime: 'not-a-timestamp' }), {
      now: NOW,
    })

    assert.equal(assessment.status, 'stale')
    assert.equal(assessment.verdicts.storm?.kind, 'unclassified')
  })

  it('is stale when the reference time is empty', () => {
    const assessment = assessRisk('lagos', snapshot({ referenceTime: '' }), { now: NOW })

    assert.equal(assessment.status, 'stale')
  })

  it('never classifies from a run whose window has already expired', () => {
    const expired = snapshot().points.map((entry) => ({
      ...entry,
      validTime: new Date(Date.parse(entry.validTime) - 30 * HOUR).toISOString(),
    }))
    const assessment = assessRisk('lagos', snapshot({ points: expired }), { now: NOW })

    assert.equal(assessment.status, 'incomplete')
    assert.equal(assessment.verdicts.storm?.kind, 'unclassified')
    assert.equal(
      assessment.verdicts.storm?.kind === 'unclassified' ? assessment.verdicts.storm.reason : null,
      'missing-data',
    )
  })
})

describe('storm verdict', () => {
  it('classifies a gale when wind coverage and freshness are adequate', () => {
    const points = [
      ...snapshot().points.filter((entry) => entry.variable !== 'wind_speed'),
      ...everyThreeHours('wind_speed', [20, 30, 55, 70, 66, 48, 35, 22]),
    ]
    const assessment = assessRisk('lagos', snapshot({ points }), { now: NOW })
    const verdict = assessment.verdicts.storm

    assert.equal(assessment.status, 'ready')
    assert.equal(verdict?.kind, 'classified')
    assert.equal(
      verdict?.kind === 'classified' ? verdict.severityId : null,
      'wind_beaufort_8',
    )
  })

  it('reports below-threshold for ordinary wind', () => {
    const verdict = assessRisk('lagos', snapshot(), { now: NOW }).verdicts.storm

    assert.equal(verdict?.kind, 'below-threshold')
    assert.equal(verdict?.kind === 'below-threshold' ? verdict.thresholdKmh : null, 39)
  })

  it('withholds a classification when the data is stale, even at hurricane strength', () => {
    const points = [
      ...snapshot().points.filter((entry) => entry.variable !== 'wind_speed'),
      ...everyThreeHours('wind_speed', 150),
    ]
    const staleAt = new Date(NOW.getTime() - 30 * HOUR).toISOString()
    const verdict = assessRisk('lagos', snapshot({ points, referenceTime: staleAt }), { now: NOW })
      .verdicts.storm

    assert.equal(verdict?.kind, 'unclassified')
    assert.equal(verdict?.kind === 'unclassified' ? verdict.reason : null, 'stale-data')
  })

  it('withholds a classification when wind is under-sampled', () => {
    const points = [
      ...snapshot().points.filter((entry) => entry.variable !== 'wind_speed'),
      point('wind_speed', 130, 3),
    ]
    const verdict = assessRisk('lagos', snapshot({ points }), { now: NOW }).verdicts.storm

    assert.equal(verdict?.kind, 'unclassified')
    assert.equal(verdict?.kind === 'unclassified' ? verdict.reason : null, 'missing-data')
  })
})

describe('unsupported classifications', () => {
  it('never classifies heat or flood from the ingested variables', () => {
    const points = [
      ...snapshot().points.filter(
        (entry) => entry.variable !== 'temperature_2m' && entry.variable !== 'precipitation',
      ),
      ...everyThreeHours('temperature_2m', 46),
      ...everyThreeHours('precipitation', 40),
    ]
    const { verdicts } = assessRisk('lagos', snapshot({ points }), { now: NOW })

    assert.equal(verdicts.heat?.kind, 'unclassified')
    assert.equal(verdicts.heat?.kind === 'unclassified' ? verdicts.heat.reason : null, 'no-cited-threshold')
    assert.equal(verdicts.flood?.kind, 'unclassified')
    assert.equal(
      verdicts.flood?.kind === 'unclassified' ? verdicts.flood.reason : null,
      'no-cited-threshold',
    )
  })

  it('marks hazards with no ingested source as out of scope', () => {
    const { verdicts } = assessRisk('lagos', snapshot(), { now: NOW })

    for (const hazard of ['air_quality', 'drought', 'coastal'] as const) {
      assert.equal(verdicts[hazard]?.kind, 'unclassified')
      assert.equal(
        verdicts[hazard]?.kind === 'unclassified' ? verdicts[hazard].reason : null,
        'not-in-scope',
      )
    }
  })
})

describe('configuration', () => {
  it('honours a custom window and threshold set', () => {
    const assessment = assessRisk('lagos', snapshot(), {
      now: NOW,
      thresholds: {
        ...DEFAULT_THRESHOLDS,
        windowHours: 12,
        wind: { ...DEFAULT_THRESHOLDS.wind, notableFromBeaufort: 3 },
      },
    })

    assert.equal(assessment.evidence.windowHours, 12)
    assert.deepEqual(assessment.evidence.coverage.wind_speed, { observed: 4, expected: 4 })
    assert.equal(assessment.status, 'ready')
  })

  it('only reports the hazards it is asked for', () => {
    const { verdicts } = assessRisk('lagos', snapshot(), { now: NOW, hazards: ['storm'] })

    assert.deepEqual(Object.keys(verdicts), ['storm'])
  })
})
