import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseBriefEnvelope } from './brief-contract.ts'

const VALID = {
  brief: {
    cityKey: 'lagos',
    cityName: 'Lagos',
    headline: 'Conditions for Lagos over the next 72 hours',
    summary: 'Temperature ranges from 24 to 31 °C over the next 72 hours. Peak wind is 22 km/h.',
    actions: ['Keep an eye on the next forecast update before making plans.'],
    source: 'deterministic',
    model: null,
    fallbackReason: 'not-configured',
  },
  assessment: {
    cityKey: 'lagos',
    status: 'ready',
    forecastReferenceTime: '2026-11-25T00:00:00.000Z',
    fetchedAt: '2026-11-25T09:30:00.000Z',
    source: 'ECMWF Open Data',
    licence: 'CC BY 4.0',
    evidence: {
      windowHours: 72,
      windowStart: '2026-11-25T10:00:00.000Z',
      windowEnd: '2026-11-28T10:00:00.000Z',
      maxTemperatureC: 31.2,
      minTemperatureC: 24.1,
      maxWindSpeedKmh: 22.4,
      windDirectionDeg: 210,
      precipitationTotalMm: 12.5,
      temperatureTrendC: 1.2,
      windSpeedTrendKmh: -3.1,
      pressureTrendHpa: 0.4,
      coverage: { wind_speed: { observed: 24, expected: 24 } },
    },
    verdicts: {
      storm: {
        kind: 'classified',
        hazard: 'storm',
        severityId: 'beaufort-6',
        beaufort: 6,
        label: 'Strong breeze',
        observedKmh: 42.5,
        thresholdKmh: 39,
        source: 'WMO Beaufort scale',
      },
      heat: {
        kind: 'unclassified',
        hazard: 'heat',
        reason: 'no-cited-threshold',
        detail: 'No published threshold is applied to this data.',
      },
      flood: {
        kind: 'unclassified',
        hazard: 'flood',
        reason: 'not-in-scope',
        detail: 'This build ingests no river or drainage data.',
      },
    },
  },
}

function clone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value))
}

function parse(payload: unknown) {
  return parseBriefEnvelope(payload)
}

describe('parseBriefEnvelope', () => {
  it('accepts a response produced by the deployed function', () => {
    const result = parse(clone(VALID))

    assert.equal(result.ok, true)
    if (!result.ok) return

    assert.equal(result.data.brief.cityName, 'Lagos')
    assert.equal(result.data.brief.source, 'deterministic')
    assert.equal(result.data.brief.fallbackReason, 'not-configured')
    assert.equal(result.data.assessment.status, 'ready')
    assert.equal(result.data.assessment.evidence.maxWindSpeedKmh, 22.4)
  })

  it('keeps every verdict kind with its own fields', () => {
    const result = parse(clone(VALID))

    assert.equal(result.ok, true)
    if (!result.ok) return

    const { storm, heat } = result.data.assessment.verdicts
    assert.equal(storm?.kind, 'classified')
    if (storm?.kind === 'classified') assert.equal(storm.beaufort, 6)
    assert.equal(heat?.kind, 'unclassified')
    if (heat?.kind === 'unclassified') assert.equal(heat.reason, 'no-cited-threshold')
  })

  it('accepts a model-written brief', () => {
    const payload = clone(VALID) as Record<string, Record<string, unknown>>
    payload.brief.source = 'groq'
    payload.brief.model = 'openai/gpt-oss-20b'
    delete payload.brief.fallbackReason

    const result = parse(payload)

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.brief.source, 'groq')
    assert.equal(result.data.brief.model, 'openai/gpt-oss-20b')
    assert.equal(result.data.brief.fallbackReason, undefined)
  })

  it('drops an unrecognised fallback reason instead of rejecting the brief', () => {
    const payload = clone(VALID) as typeof VALID
    ;(payload.brief as { fallbackReason?: string }).fallbackReason = 'some-future-reason'

    const result = parse(payload)

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.data.brief.fallbackReason, undefined)
  })

  it('rejects anything that is not the expected envelope', () => {
    assert.equal(parse(null).ok, false)
    assert.equal(parse('a string').ok, false)
    assert.equal(parse([]).ok, false)
    assert.equal(parse({}).ok, false)
    assert.equal(parse({ brief: VALID.brief }).ok, false)
    assert.equal(parse({ assessment: VALID.assessment }).ok, false)
    assert.equal(parse({ error: 'no_location' }).ok, false)
  })

  it('rejects a brief with no headline, no summary or no actions', () => {
    for (const field of ['headline', 'summary'] as const) {
      const payload = clone(VALID) as typeof VALID
      ;(payload.brief as Record<string, unknown>)[field] = ''
      assert.equal(parse(payload).ok, false, field)
    }

    const noActions = clone(VALID) as typeof VALID
    noActions.brief.actions = []
    assert.equal(parse(noActions).ok, false)

    const blankAction = clone(VALID) as typeof VALID
    blankAction.brief.actions = ['   ']
    assert.equal(parse(blankAction).ok, false)
  })

  it('rejects an unknown brief source', () => {
    const payload = clone(VALID) as typeof VALID
    ;(payload.brief as Record<string, unknown>).source = 'unknown-model'
    assert.equal(parse(payload).ok, false)
  })

  it('rejects an unknown assessment status', () => {
    const payload = clone(VALID) as typeof VALID
    ;(payload.assessment as Record<string, unknown>).status = 'probably-fine'
    assert.equal(parse(payload).ok, false)
  })

  it('rejects evidence that is missing a figure or holds a non-finite one', () => {
    const missing = clone(VALID) as typeof VALID
    delete (missing.assessment.evidence as Record<string, unknown>).maxWindSpeedKmh
    assert.equal(parse(missing).ok, false)

    const nonFinite = clone(VALID) as typeof VALID
    ;(nonFinite.assessment.evidence as Record<string, unknown>).maxTemperatureC = null
    assert.equal(parse(nonFinite).ok, true, 'null is an honest absence, not a rejection')

    const stringy = clone(VALID) as typeof VALID
    ;(stringy.assessment.evidence as Record<string, unknown>).maxWindSpeedKmh = '22'
    assert.equal(parse(stringy).ok, false)
  })

  it('rejects a verdict whose kind or hazard is not recognised', () => {
    const badKind = clone(VALID) as typeof VALID
    ;(badKind.assessment.verdicts.storm as Record<string, unknown>).kind = 'catastrophic'
    assert.equal(parse(badKind).ok, false)

    const badHazard = clone(VALID) as Record<string, Record<string, unknown>>
    badHazard.assessment.verdicts = {
      volcano: VALID.assessment.verdicts.storm,
    }
    assert.equal(parse(badHazard).ok, false)

    const badReason = clone(VALID) as typeof VALID
    ;(badReason.assessment.verdicts.heat as Record<string, unknown>).reason = 'made-up'
    assert.equal(parse(badReason).ok, false)
  })
})
