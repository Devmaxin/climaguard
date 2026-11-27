import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ClimateUnit, ClimateVariable } from '../../../src/lib/supabase/database.types.ts'
import {
  assembleAssessment,
  buildSnapshot,
  composeDeterministicBrief,
  findForbiddenContent,
  findUnsupportedEscalation,
  findUnsupportedFigures,
  allowedFigures,
  generateBrief,
  parseBriefContent,
  type ForecastRow,
  type GroqRequestInit,
  type GroqResponseLike,
} from './brief-core.ts'

const NOW = new Date('2026-11-25T10:00:00.000Z')
const HOUR = 60 * 60 * 1000
const REFERENCE = '2026-11-25T00:00:00.000Z'
const FETCHED = '2026-11-25T09:30:00.000Z'

const UNITS: Record<ClimateVariable, ClimateUnit> = {
  temperature_2m: 'degC',
  wind_speed: 'kmh',
  wind_direction: 'deg',
  precipitation: 'mm',
  pressure_msl: 'hPa',
}

function rows(
  variable: ClimateVariable,
  values: number[],
  options: { reference?: string; fetchedAt?: string } = {},
): ForecastRow[] {
  return values.map((value, index) => {
    const step = (index + 1) * 3
    return {
      variable,
      unit: UNITS[variable],
      value,
      valid_time: new Date(NOW.getTime() + step * HOUR).toISOString(),
      forecast_step: step,
      forecast_reference_time: options.reference ?? REFERENCE,
      fetched_at: options.fetchedAt ?? FETCHED,
      source: 'ECMWF Open Data (IFS 0.25°)',
      source_licence: 'CC BY 4.0',
    } satisfies ForecastRow
  })
}

function forecastRows(overrides: Partial<Record<ClimateVariable, number[]>> = {}): ForecastRow[] {
  return [
    ...rows('temperature_2m', overrides.temperature_2m ?? [26, 28, 30, 33, 31, 29, 27, 25]),
    ...rows('wind_speed', overrides.wind_speed ?? [12, 14, 15, 16, 15, 14, 13, 12]),
    ...rows('wind_direction', [200, 200, 200, 210, 210, 210, 220, 220]),
    ...rows('precipitation', overrides.precipitation ?? [0.2, 0, 1.4, 2.6, 0.8, 0, 0.4, 0.1]),
    ...rows('pressure_msl', [1010, 1009, 1008, 1007, 1006, 1005, 1005, 1004]),
  ]
}

const VALID_CONTENT = JSON.stringify({
  headline: 'Calm day ahead in Lagos',
  summary: 'Temperatures peak near 33 °C with light wind around 16 km/h. Rainfall totals 5.5 mm.',
  actions: ['Check the forecast again this evening.'],
})

function groqResponse(content: string, status = 200): GroqResponseLike {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ choices: [{ message: { content } }] }),
  }
}

function transportReturning(response: GroqResponseLike) {
  const calls: { url: string; init: GroqRequestInit }[] = []
  const transport = async (url: string, init: GroqRequestInit) => {
    calls.push({ url, init })
    return response
  }
  return { calls, transport }
}

const ENV = { apiKey: 'test-key', model: 'test-model' }

describe('snapshot assembly', () => {
  it('returns null when nothing was ingested', () => {
    assert.equal(buildSnapshot('lagos', []), null)
  })

  it('keeps only the newest model run', () => {
    const mixed = [
      ...rows('temperature_2m', [30], { reference: '2026-11-24T00:00:00.000Z' }),
      ...rows('temperature_2m', [20], { reference: REFERENCE }),
    ]

    const snapshot = buildSnapshot('lagos', mixed)

    assert.equal(snapshot?.referenceTime, REFERENCE)
    assert.equal(snapshot?.points.length, 1)
    assert.equal(snapshot?.points[0].value, 20)
  })

  it('prefers the newest parseable reference over an unparseable one', () => {
    const mixed = [
      ...rows('temperature_2m', [30], { reference: 'not-a-timestamp' }),
      ...rows('temperature_2m', [20], { reference: REFERENCE }),
    ]

    assert.equal(buildSnapshot('lagos', mixed)?.referenceTime, REFERENCE)
  })

  it('keeps an unparseable reference rather than inventing one', () => {
    const onlyBroken = rows('temperature_2m', [30], { reference: 'not-a-timestamp' })

    assert.equal(buildSnapshot('lagos', onlyBroken)?.referenceTime, 'not-a-timestamp')
  })

  it('reports a re-upserted old run as stale', () => {
    const oldRun = new Date(NOW.getTime() - 20 * HOUR).toISOString()
    const refreshed = forecastRows().map((row) => ({
      ...row,
      forecast_reference_time: oldRun,
      fetched_at: NOW.toISOString(),
    }))

    const assessment = assembleAssessment('lagos', refreshed, { now: NOW })

    assert.equal(assessment.status, 'stale')
    assert.equal(assessment.fetchedAt, NOW.toISOString())
  })

  it('runs the existing risk engine over the reconstructed snapshot', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })

    assert.equal(assessment.status, 'ready')
    assert.equal(assessment.evidence.maxTemperatureC, 33)
    assert.equal(assessment.evidence.maxWindSpeedKmh, 16)
    assert.equal(assessment.verdicts.heat?.kind, 'unclassified')
  })
})

describe('deterministic brief', () => {
  it('reports no data without inventing conditions', () => {
    const assessment = assembleAssessment('dhaka', [], { now: NOW })
    const brief = composeDeterministicBrief(assessment)

    assert.equal(assessment.status, 'no-data')
    assert.equal(brief.source, 'deterministic')
    assert.match(brief.headline, /No forecast/)
    assert.doesNotMatch(brief.summary, /\d/)
  })

  it('withholds classification language when the forecast is stale', () => {
    const staleAt = new Date(NOW.getTime() - 30 * HOUR).toISOString()
    const assessment = assembleAssessment(
      'lagos',
      forecastRows().map((row) => ({ ...row, forecast_reference_time: staleAt })),
      { now: NOW },
    )

    assert.equal(assessment.status, 'stale')
    assert.match(composeDeterministicBrief(assessment).headline, /out of date/)
  })

  it('names the wind tier only when the engine classified it', () => {
    const assessment = assembleAssessment(
      'lagos',
      forecastRows({ wind_speed: [20, 30, 55, 70, 66, 48, 35, 22] }),
      { now: NOW },
    )

    assert.equal(assessment.verdicts.storm?.kind, 'classified')
    assert.match(composeDeterministicBrief(assessment).headline, /Gale/)
  })
})

describe('groq handling', () => {
  it('falls back without calling out when no model is configured', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const { calls, transport } = transportReturning(groqResponse(VALID_CONTENT))

    const brief = await generateBrief({ assessment, env: {}, transport })

    assert.equal(calls.length, 0)
    assert.equal(brief.source, 'deterministic')
    assert.equal(brief.fallbackReason, 'not-configured')
  })

  it('accepts a valid model response', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const { transport, calls } = transportReturning(groqResponse(VALID_CONTENT))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'groq')
    assert.equal(brief.model, 'test-model')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://api.groq.com/openai/v1/chat/completions')
    assert.match(calls[0].init.headers.authorization, /^Bearer /)
  })

  it('falls back on a rate limit', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const { transport } = transportReturning(groqResponse('', 429))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'deterministic')
    assert.equal(brief.fallbackReason, 'rate-limited')
  })

  it('falls back on a provider error', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const { transport } = transportReturning(groqResponse('', 503))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.fallbackReason, 'provider-error')
  })

  it('falls back on a timeout', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const transport = async () => {
      const error = new Error('aborted')
      error.name = 'TimeoutError'
      throw error
    }

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'deterministic')
    assert.equal(brief.fallbackReason, 'timeout')
  })

  it('never calls the model when there is no forecast', async () => {
    const assessment = assembleAssessment('dhaka', [], { now: NOW })
    const { calls, transport } = transportReturning(groqResponse(VALID_CONTENT))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(calls.length, 0)
    assert.equal(brief.fallbackReason, 'no-data')
  })
})

describe('output validation', () => {
  it('rejects a body that is not JSON', () => {
    assert.equal(parseBriefContent('not json at all'), null)
  })

  it('rejects a JSON body with the wrong shape', () => {
    assert.equal(parseBriefContent(JSON.stringify({ headline: 5 })), null)
    assert.equal(parseBriefContent(JSON.stringify({ headline: 'x', summary: 'y', actions: [] })), null)
    assert.equal(
      parseBriefContent(JSON.stringify({ headline: 'x'.repeat(200), summary: 'y', actions: ['z'] })),
      null,
    )
  })

  it('accepts a fenced JSON body', () => {
    const parsed = parseBriefContent('```json\n' + VALID_CONTENT + '\n```')
    assert.equal(parsed?.headline, 'Calm day ahead in Lagos')
  })

  it('maps a malformed provider payload to a fallback', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const transport = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    })

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.fallbackReason, 'invalid-response')
  })

  it('discards emergency and medical language', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const unsafe = JSON.stringify({
      headline: 'Emergency conditions in Lagos',
      summary: 'Evacuate now.',
      actions: ['Call 911.'],
    })
    const { transport } = transportReturning(groqResponse(unsafe))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'deterministic')
    assert.equal(brief.fallbackReason, 'unsafe-content')
  })

  it('discards a flood claim the engine never made', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const claim = JSON.stringify({
      headline: 'Flood risk is likely in Lagos',
      summary: 'Flooding is likely tonight.',
      actions: ['Move valuables upstairs.'],
    })
    const { transport } = transportReturning(groqResponse(claim))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.fallbackReason, 'unsafe-content')
  })

  it('discards figures that are not in the assessment', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const invented = JSON.stringify({
      headline: 'Hot day in Lagos',
      summary: 'Temperatures reach 41 °C with winds of 80 km/h.',
      actions: ['Stay cool.'],
    })
    const { transport } = transportReturning(groqResponse(invented))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.fallbackReason, 'unsupported-figures')
  })

  it('discards escalation the deterministic assessment never made', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const escalating = JSON.stringify({
      headline: 'Severe conditions in Lagos',
      summary: 'Dangerous winds are possible this afternoon.',
      actions: ['Keep an eye on the next update.'],
    })
    const { transport } = transportReturning(groqResponse(escalating))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'deterministic')
    assert.equal(brief.fallbackReason, 'unsafe-content')
  })

  it('discards the reviewed storm and emergency phrasing end to end', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })

    for (const content of [
      'Gale-force winds expected.',
      'Violent storm likely.',
      'Hurricane-force winds.',
      'Take shelter immediately.',
      'Stay indoors until further notice.',
    ]) {
      const { transport } = transportReturning(
        groqResponse(
          JSON.stringify({
            headline: content,
            summary: 'Conditions continue through the afternoon.',
            actions: ['Check the next forecast update.'],
          }),
        ),
      )

      const brief = await generateBrief({ assessment, env: ENV, transport })
      assert.equal(brief.source, 'deterministic')
      assert.equal(brief.fallbackReason, 'unsafe-content')
    }
  })

  it('discards plain storm-tier claims and higher tiers below their threshold end to end', async () => {
    const calm = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const stormTen = assembleAssessment(
      'lagos',
      forecastRows({ wind_speed: [95, 95, 95, 95, 95, 95, 95, 95] }),
      { now: NOW },
    )

    assert.equal(stormTen.verdicts.storm?.kind, 'classified')

    const rejected: [typeof calm, string][] = [
      [calm, 'A gale is expected in Lagos.'],
      [calm, 'Storm conditions are likely in Lagos.'],
      [calm, 'A hurricane is approaching Lagos.'],
      [calm, 'Near gale conditions continue.'],
      // Beaufort 10 is a storm, not a violent storm.
      [stormTen, 'Violent storm likely in Lagos.'],
    ]

    for (const [assessment, content] of rejected) {
      const { transport } = transportReturning(
        groqResponse(
          JSON.stringify({
            headline: content,
            summary: 'Conditions continue through the afternoon.',
            actions: ['Check the next forecast update.'],
          }),
        ),
      )

      const brief = await generateBrief({ assessment, env: ENV, transport })
      assert.equal(brief.source, 'deterministic', content)
      assert.equal(brief.fallbackReason, 'unsafe-content', content)
    }

    const { transport } = transportReturning(
      groqResponse(
        JSON.stringify({
          headline: 'Storm conditions are likely in Lagos.',
          summary: 'Conditions continue through the afternoon.',
          actions: ['Check the next forecast update.'],
        }),
      ),
    )

    const authorised = await generateBrief({ assessment: stormTen, env: ENV, transport })
    assert.equal(authorised.source, 'groq')
  })

  it('discards emergency instructions and their common variations end to end', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })

    for (const content of [
      'Take cover immediately.',
      'Stay inside until further notice.',
      'Remain inside.',
      'Shelter-in-place.',
      "Don't go outside.",
      'Do not go outdoors.',
      'Do not leave the house.',
      'Get to shelter.',
      'Shelter immediately.',
    ]) {
      const { transport } = transportReturning(
        groqResponse(
          JSON.stringify({
            headline: content,
            summary: 'Conditions continue through the afternoon.',
            actions: ['Check the next forecast update.'],
          }),
        ),
      )

      const brief = await generateBrief({ assessment, env: ENV, transport })
      assert.equal(brief.source, 'deterministic', content)
      assert.equal(brief.fallbackReason, 'unsafe-content', content)
    }
  })

  it('discards an absolute figure used as a trend end to end', async () => {
    const assessment = assembleAssessment(
      'lagos',
      forecastRows({
        temperature_2m: [1, 1, 1, 1, 1, 1, 1, 3],
        wind_speed: [16, 16, 16, 16, 16, 16, 16, 16],
      }),
      { now: NOW },
    )

    assert.equal(assessment.evidence.temperatureTrendC, 2)
    assert.equal(assessment.evidence.maxTemperatureC, 3)

    for (const summary of ['A fall of 3 °C is expected.', 'A rise of 16 km/h is expected.', 'Winds are 0 km/h.']) {
      const { transport } = transportReturning(
        groqResponse(
          JSON.stringify({
            headline: 'Conditions in Lagos',
            summary,
            actions: ['Check the next forecast update.'],
          }),
        ),
      )

      const brief = await generateBrief({ assessment, env: ENV, transport })
      assert.equal(brief.source, 'deterministic', summary)
      assert.equal(brief.fallbackReason, 'unsupported-figures', summary)
    }
  })

  it('discards unsupported Beaufort figures end to end', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const { transport } = transportReturning(
      groqResponse(
        JSON.stringify({
          headline: 'Beaufort 12 conditions in Lagos',
          summary: 'Winds strengthen through the afternoon.',
          actions: ['Check the next forecast update.'],
        }),
      ),
    )

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'deterministic')
    assert.equal(brief.fallbackReason, 'unsupported-figures')
  })

  it('accepts a factual restatement of the supplied evidence', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const faithful = JSON.stringify({
      headline: 'Warm afternoon in Lagos',
      summary: 'Temperatures peak near 33 °C with wind around 16 km/h and 5.5 mm of rain.',
      actions: ['Plan outdoor work for the morning.'],
    })
    const { transport } = transportReturning(groqResponse(faithful))

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'groq')
    assert.equal(brief.fallbackReason, undefined)
  })

  it('accepts figures that match the evidence', async () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const transport = async () => groqResponse(VALID_CONTENT)

    const brief = await generateBrief({ assessment, env: ENV, transport })

    assert.equal(brief.source, 'groq')
  })
})

describe('guardrail helpers', () => {
  it('flags each forbidden category', () => {
    assert.equal(findForbiddenContent('Evacuate the area'), 'emergency')
    assert.equal(findForbiddenContent('Call 911 now'), 'authority')
    assert.equal(findForbiddenContent('Take your medication'), 'medical')
    assert.equal(findForbiddenContent('This is guaranteed to happen'), 'certainty')
    assert.equal(findForbiddenContent('Take shelter immediately.'), 'emergency-instruction')
    assert.equal(findForbiddenContent('Stay indoors until further notice.'), 'emergency-instruction')
    assert.equal(findForbiddenContent('Seek shelter now.'), 'emergency-instruction')
    assert.equal(findForbiddenContent('Dry with light wind.'), null)
  })

  it('builds the allowed figure set from the assessment alone', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const allowed = allowedFigures(assessment)

    assert.ok(allowed.absolute.has('33 °C'))
    assert.ok(allowed.absolute.has('16 km/h'))
    assert.ok(!allowed.absolute.has('41 °C'))

    assert.equal(findUnsupportedFigures('It reaches 41 °C.', allowed), '41 °C')
    assert.equal(findUnsupportedFigures('It reaches 33 °C.', allowed), null)
  })

  it('rejects escalation the assessment does not make', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })

    assert.equal(
      findUnsupportedEscalation('Severe winds are dangerous.', assessment),
      'severity-escalation',
    )
    assert.equal(
      findUnsupportedEscalation('A weather warning is in force.', assessment),
      'alerting',
    )
    assert.equal(findUnsupportedEscalation('Warm and dry with light wind.', assessment), null)
    assert.equal(findUnsupportedEscalation('Breezy with showers later.', assessment), null)
  })

  it('rejects the reviewed storm-severity phrasing when the engine did not classify one', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })

    assert.equal(
      findUnsupportedEscalation('Gale-force winds expected.', assessment),
      'storm-escalation',
    )
    assert.equal(findUnsupportedEscalation('Violent storm likely.', assessment), 'storm-escalation')
    assert.equal(findUnsupportedEscalation('Hurricane-force winds.', assessment), 'storm-escalation')
  })

  it('never rejects a hazard mentioned without a risk claim', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })

    assert.equal(
      findUnsupportedEscalation('Heat is not assessed in this build.', assessment),
      null,
    )
  })

  it('allows the engine’s own severity wording and nothing stronger', () => {
    const gale = assembleAssessment(
      'lagos',
      forecastRows({ wind_speed: [80, 80, 80, 80, 80, 80, 80, 80] }),
      { now: NOW },
    )

    assert.equal(gale.verdicts.storm?.kind, 'classified')
    assert.equal(findUnsupportedEscalation('Severe gale conditions continue.', gale), null)
    assert.equal(findUnsupportedEscalation('Gale-force winds continue.', gale), null)
    assert.equal(
      findUnsupportedEscalation('Extreme risk from severe gale conditions.', gale),
      'severity-escalation',
    )
    assert.equal(
      findUnsupportedEscalation('Hurricane-force winds continue.', gale),
      'storm-escalation',
    )
  })

  it('gates every storm-tier name, including plain ones, on the classified tier', () => {
    const calm = assembleAssessment('lagos', forecastRows(), { now: NOW })

    for (const claim of [
      'A gale is expected in Lagos.',
      'Storm conditions are likely in Lagos.',
      'A hurricane is approaching Lagos.',
      'Near gale conditions continue.',
      'Severe gale conditions continue.',
      'Violent storm likely.',
      'Typhoon-force winds.',
    ]) {
      assert.equal(findUnsupportedEscalation(claim, calm), 'storm-escalation', claim)
    }
  })

  it('does not let an engine label strip out a higher-tier claim', () => {
    const stormTen = assembleAssessment(
      'lagos',
      forecastRows({ wind_speed: [95, 95, 95, 95, 95, 95, 95, 95] }),
      { now: NOW },
    )

    assert.equal(stormTen.verdicts.storm?.kind, 'classified')
    assert.equal(findUnsupportedEscalation('Storm conditions continue.', stormTen), null)
    assert.equal(findUnsupportedEscalation('Violent storm likely.', stormTen), 'storm-escalation')
    assert.equal(findUnsupportedEscalation('Hurricane force winds.', stormTen), 'storm-escalation')
  })

  it('accepts each tier name at its own threshold and rejects it one tier below', () => {
    const at = (kmh: number) =>
      assembleAssessment(
        'lagos',
        forecastRows({ wind_speed: [kmh, kmh, kmh, kmh, kmh, kmh, kmh, kmh] }),
        { now: NOW },
      )

    const nearGale = at(55)
    assert.equal(findUnsupportedEscalation('Near gale conditions continue.', nearGale), null)
    assert.equal(findUnsupportedEscalation('Gale-force winds expected.', nearGale), 'storm-escalation')

    const severeGale = at(80)
    assert.equal(findUnsupportedEscalation('Severe gale conditions continue.', severeGale), null)
    assert.equal(findUnsupportedEscalation('Storm conditions continue.', severeGale), 'storm-escalation')

    const violentStorm = at(105)
    assert.equal(findUnsupportedEscalation('Violent storm likely.', violentStorm), null)
    assert.equal(findUnsupportedEscalation('Hurricane-force winds.', violentStorm), 'storm-escalation')

    const hurricane = at(130)
    assert.equal(findUnsupportedEscalation('Hurricane conditions continue.', hurricane), null)
  })

  it('recognises storm-tier claims written with dashes, spacing and inflections', () => {
    const calm = assembleAssessment('lagos', forecastRows(), { now: NOW })

    for (const claim of [
      'Gale–force winds expected.',
      'Hurricane–force winds.',
      'Gale  force winds expected.',
      'Gales force winds expected.',
      'A gale is expected.',
      'Storms are likely later.',
      'Near-gale conditions continue.',
    ]) {
      assert.equal(findUnsupportedEscalation(claim, calm), 'storm-escalation', claim)
    }
  })

  it('leaves ordinary weather prose alone', () => {
    const calm = assembleAssessment('lagos', forecastRows(), { now: NOW })

    for (const prose of [
      'A light breeze in the afternoon.',
      'Showers ease by evening.',
      'Warm with sunny spells.',
      'Winds stay light through the afternoon.',
    ]) {
      assert.equal(findUnsupportedEscalation(prose, calm), null, prose)
    }
  })

  it('flags every reviewed emergency instruction', () => {
    for (const instruction of [
      'Take cover immediately.',
      'Stay inside until further notice.',
      'Remain inside.',
      'Shelter-in-place.',
      "Don't go outside.",
      'Do not go outdoors.',
      'Do not leave the house.',
      'Get to shelter.',
      'Shelter immediately.',
      'Remain indoors until it passes.',
    ]) {
      assert.equal(findForbiddenContent(instruction), 'emergency-instruction', instruction)
    }
  })

  it('does not flag descriptive prose as an emergency instruction', () => {
    for (const prose of [
      'Secure loose outdoor items before the wind strengthens.',
      'Follow local official advice if conditions change.',
      '"Shelter" is not mentioned in the assessment.',
      'Trees may lose branches in exposed places.',
    ]) {
      assert.equal(findForbiddenContent(prose), null, prose)
    }
  })

  it('does not let an absolute measurement authorise a trend claim', () => {
    const crossUse = assembleAssessment(
      'lagos',
      forecastRows({
        temperature_2m: [1, 1, 1, 1, 1, 1, 1, 3],
        wind_speed: [16, 16, 16, 16, 16, 16, 16, 16],
      }),
      { now: NOW },
    )
    const allowed = allowedFigures(crossUse)

    assert.ok(allowed.absolute.has('3 °C'))
    assert.ok(allowed.trends.has('2 °C'))
    assert.ok(allowed.absolute.has('16 km/h'))
    assert.ok(allowed.trends.has('0 km/h'))

    assert.equal(findUnsupportedFigures('A fall of 3 °C.', allowed), '3 °C')
    assert.equal(findUnsupportedFigures('A rise of 16 km/h.', allowed), '16 km/h')
    assert.equal(findUnsupportedFigures('Winds are 0 km/h.', allowed), '0 km/h')
  })

  it('validates both the direction and the magnitude of a trend', () => {
    const assessment = assembleAssessment(
      'lagos',
      forecastRows({ temperature_2m: [1, 1, 1, 1, 1, 1, 1, 3] }),
      { now: NOW },
    )
    const allowed = allowedFigures(assessment)

    assert.equal(findUnsupportedFigures('A temperature rise of 2 °C.', allowed), null)
    assert.equal(findUnsupportedFigures('A temperature fall of 2 °C is expected.', allowed), '2 °C')
    assert.equal(findUnsupportedFigures('A temperature rise of 3 °C.', allowed), '3 °C')
    assert.equal(findUnsupportedFigures('Temperatures reach 3 °C.', allowed), null)
  })

  it('accepts a trend figure spelled out with a qualifier', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const allowed = allowedFigures(assessment)

    assert.ok(allowed.trends.has('-1 °C'))
    assert.equal(findUnsupportedFigures('A fall of roughly 1 °C.', allowed), null)
    assert.equal(findUnsupportedFigures('A rise of roughly 1 °C.', allowed), '1 °C')
  })

  it('accepts the trends and wind direction the model is given', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const allowed = allowedFigures(assessment)

    assert.ok(allowed.trends.has('-1 °C'))
    assert.ok(allowed.absolute.has('200 °'))
    assert.ok(allowed.trends.has('-6 hPa'))

    assert.equal(findUnsupportedFigures('Wind from 200° with a 6 hPa pressure fall.', allowed), null)
    assert.equal(findUnsupportedFigures('A temperature fall of 1 °C.', allowed), null)
    assert.equal(findUnsupportedFigures('A temperature trend of -1 °C.', allowed), null)
  })

  it('does not let a trend magnitude authorise an absolute or opposite-sign figure', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const allowed = allowedFigures(assessment)

    assert.equal(findUnsupportedFigures('A temperature trend of 1 °C.', allowed), '1 °C')
    assert.equal(findUnsupportedFigures('A temperature rise of 1 °C.', allowed), '1 °C')
    assert.equal(findUnsupportedFigures('Pressure rises 6 hPa.', allowed), '6 hPa')
    assert.equal(
      findUnsupportedFigures('Temperatures fall later but reach 1 °C.', allowed),
      '1 °C',
    )
  })

  it('rejects cross-variable figure substitution', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const allowed = allowedFigures(assessment)

    assert.equal(findUnsupportedFigures('Rainfall totals 16 mm.', allowed), '16 mm')
    assert.equal(findUnsupportedFigures('Peak wind is 5.5 km/h.', allowed), '5.5 km/h')
  })

  it('validates Beaufort figures against the deterministic storm verdict', () => {
    const calm = assembleAssessment('lagos', forecastRows(), { now: NOW })
    const calmAllowed = allowedFigures(calm)

    assert.equal(findUnsupportedFigures('Beaufort 12 conditions.', calmAllowed), 'Beaufort 12')
    assert.equal(findUnsupportedFigures('Bft 12 conditions.', calmAllowed), 'Beaufort 12')

    const gale = assembleAssessment(
      'lagos',
      forecastRows({ wind_speed: [80, 80, 80, 80, 80, 80, 80, 80] }),
      { now: NOW },
    )
    const galeAllowed = allowedFigures(gale)

    assert.equal(findUnsupportedFigures('Beaufort 9 conditions.', galeAllowed), null)
    assert.equal(findUnsupportedFigures('Bft 9 conditions.', galeAllowed), null)
    assert.equal(findUnsupportedFigures('Beaufort 12 conditions.', galeAllowed), 'Beaufort 12')
  })

  it('accepts a faithful figure however it is formatted', () => {
    const assessment = assembleAssessment('lagos', forecastRows(), { now: NOW })

    assert.equal(findUnsupportedFigures('Rainfall totals 5.50 mm.', allowedFigures(assessment)), null)
  })

  it('recognises common unit spellings for supplied values', () => {
    const allowed = allowedFigures(assembleAssessment('lagos', forecastRows(), { now: NOW }))

    assert.equal(findUnsupportedFigures('A high of 33 Celsius.', allowed), null)
    assert.equal(findUnsupportedFigures('Wind from 200 degrees.', allowed), null)
  })

  it('rejects units the assessment never used', () => {
    const allowed = allowedFigures(assembleAssessment('lagos', forecastRows(), { now: NOW }))

    assert.equal(findUnsupportedFigures('Winds of 16 mph.', allowed), '16 mph')
    assert.equal(findUnsupportedFigures('A high of 33 Fahrenheit.', allowed), '33 Fahrenheit')
    assert.equal(findUnsupportedFigures('A high of 33 °F.', allowed), '33 °F')
    assert.equal(findUnsupportedFigures('Winds of 16 m/s.', allowed), '16 m/s')
    assert.equal(findUnsupportedFigures('Winds of 16 knots.', allowed), '16 knots')
    assert.equal(findUnsupportedFigures('A 30% chance of rain.', allowed), '30 %')
    assert.equal(findUnsupportedFigures('A 30 percent chance of rain.', allowed), '30 percent')
  })

  it('rejects numeric claims whose unit is not recognised at all', () => {
    const allowed = allowedFigures(assembleAssessment('lagos', forecastRows(), { now: NOW }))

    assert.equal(findUnsupportedFigures('Winds reach 41 bananas.', allowed), '41')
    assert.equal(findUnsupportedFigures('Expect a score of 7.', allowed), '7')
  })
})
