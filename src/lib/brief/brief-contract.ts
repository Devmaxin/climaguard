/**
 * Wire contract of the `daily-brief` edge function, plus a strict validator.
 *
 * The shapes mirror `supabase/functions/daily-brief/brief-core.ts` and
 * `supabase/functions/_shared/risk/types.ts` structurally. They are restated
 * rather than imported so the browser bundle never pulls in server code.
 *
 * Nothing from the network is trusted: `parseBriefEnvelope` returns a failure
 * for anything that does not match exactly, and the UI shows an error rather
 * than a partial or guessed brief.
 */

export type BriefSource = 'groq' | 'deterministic'

export type BriefFallbackReason =
  | 'not-configured'
  | 'no-data'
  | 'stale-data'
  | 'incomplete-data'
  | 'timeout'
  | 'network-error'
  | 'rate-limited'
  | 'provider-error'
  | 'invalid-response'
  | 'unsafe-content'
  | 'unsupported-figures'

const FALLBACK_REASONS: readonly BriefFallbackReason[] = [
  'not-configured',
  'no-data',
  'stale-data',
  'incomplete-data',
  'timeout',
  'network-error',
  'rate-limited',
  'provider-error',
  'invalid-response',
  'unsafe-content',
  'unsupported-figures',
]

export type DailyBriefView = {
  cityKey: string
  cityName: string
  headline: string
  summary: string
  actions: string[]
  source: BriefSource
  model: string | null
  fallbackReason?: BriefFallbackReason
}

export type RiskAssessmentStatus = 'ready' | 'incomplete' | 'stale' | 'no-data'

export type HazardKey = 'heat' | 'flood' | 'storm' | 'air_quality' | 'drought' | 'coastal'

const HAZARD_KEYS: readonly HazardKey[] = [
  'heat',
  'flood',
  'storm',
  'air_quality',
  'drought',
  'coastal',
]

export type UnclassifiedReason = 'no-cited-threshold' | 'missing-data' | 'stale-data' | 'not-in-scope'

export type HazardVerdictView =
  | {
      kind: 'classified'
      hazard: HazardKey
      severityId: string
      beaufort: number
      label: string
      observedKmh: number
      thresholdKmh: number
      source: string
    }
  | {
      kind: 'below-threshold'
      hazard: HazardKey
      observedKmh: number
      thresholdKmh: number
      source: string
    }
  | {
      kind: 'unclassified'
      hazard: HazardKey
      reason: UnclassifiedReason
      detail: string
    }

export type RiskEvidenceView = {
  windowHours: number
  windowStart: string
  windowEnd: string
  maxTemperatureC: number | null
  minTemperatureC: number | null
  maxWindSpeedKmh: number | null
  windDirectionDeg: number | null
  precipitationTotalMm: number | null
  temperatureTrendC: number | null
  windSpeedTrendKmh: number | null
  pressureTrendHpa: number | null
}

export type RiskAssessmentView = {
  cityKey: string
  status: RiskAssessmentStatus
  forecastReferenceTime: string | null
  fetchedAt: string | null
  source: string | null
  licence: string | null
  evidence: RiskEvidenceView
  verdicts: Partial<Record<HazardKey, HazardVerdictView>>
}

export type DailyBriefResponse = {
  brief: DailyBriefView
  assessment: RiskAssessmentView
}

export type BriefParseResult =
  | { ok: true; data: DailyBriefResponse }
  | { ok: false; reason: 'malformed-response' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isHazardKey(value: unknown): value is HazardKey {
  return typeof value === 'string' && (HAZARD_KEYS as readonly string[]).includes(value)
}

function isFallbackReason(value: unknown): value is BriefFallbackReason {
  return typeof value === 'string' && (FALLBACK_REASONS as readonly string[]).includes(value)
}

function parseBrief(value: unknown): DailyBriefView | null {
  if (!isRecord(value)) return null

  const { cityKey, cityName, headline, summary, actions, source, model, fallbackReason } = value

  if (!isString(cityKey) || !isString(cityName)) return null
  if (!isString(headline) || headline.trim().length === 0) return null
  if (!isString(summary) || summary.trim().length === 0) return null
  if (!Array.isArray(actions) || actions.length === 0) return null
  if (!actions.every((action) => isString(action) && action.trim().length > 0)) return null
  if (source !== 'groq' && source !== 'deterministic') return null
  if (!isStringOrNull(model)) return null

  // An unrecognised fallback reason is dropped rather than failing the brief:
  // `source` alone decides whether the text came from a model or the engine.
  const reason = isFallbackReason(fallbackReason) ? fallbackReason : undefined

  return {
    cityKey,
    cityName,
    headline,
    summary,
    actions: actions as string[],
    source,
    model,
    ...(reason ? { fallbackReason: reason } : {}),
  }
}

function parseVerdict(value: unknown): HazardVerdictView | null {
  if (!isRecord(value)) return null
  if (!isHazardKey(value.hazard)) return null

  switch (value.kind) {
    case 'classified':
      if (!isString(value.severityId) || !isString(value.label) || !isString(value.source)) return null
      if (!isFiniteNumber(value.beaufort)) return null
      if (!isFiniteNumber(value.observedKmh) || !isFiniteNumber(value.thresholdKmh)) return null
      return {
        kind: 'classified',
        hazard: value.hazard,
        severityId: value.severityId,
        beaufort: value.beaufort,
        label: value.label,
        observedKmh: value.observedKmh,
        thresholdKmh: value.thresholdKmh,
        source: value.source,
      }

    case 'below-threshold':
      if (!isString(value.source)) return null
      if (!isFiniteNumber(value.observedKmh) || !isFiniteNumber(value.thresholdKmh)) return null
      return {
        kind: 'below-threshold',
        hazard: value.hazard,
        observedKmh: value.observedKmh,
        thresholdKmh: value.thresholdKmh,
        source: value.source,
      }

    case 'unclassified': {
      const reason = value.reason
      if (
        reason !== 'no-cited-threshold' &&
        reason !== 'missing-data' &&
        reason !== 'stale-data' &&
        reason !== 'not-in-scope'
      ) {
        return null
      }
      if (!isString(value.detail)) return null
      return { kind: 'unclassified', hazard: value.hazard, reason, detail: value.detail }
    }

    default:
      return null
  }
}

function parseAssessment(value: unknown): RiskAssessmentView | null {
  if (!isRecord(value)) return null

  const status = value.status
  if (status !== 'ready' && status !== 'incomplete' && status !== 'stale' && status !== 'no-data') {
    return null
  }

  if (!isString(value.cityKey)) return null
  if (!isStringOrNull(value.forecastReferenceTime)) return null
  if (!isStringOrNull(value.fetchedAt)) return null
  if (!isStringOrNull(value.source)) return null
  if (!isStringOrNull(value.licence)) return null

  const evidence = value.evidence
  if (!isRecord(evidence)) return null
  if (!isFiniteNumber(evidence.windowHours)) return null
  if (!isString(evidence.windowStart) || !isString(evidence.windowEnd)) return null

  const evidenceFigures = [
    evidence.maxTemperatureC,
    evidence.minTemperatureC,
    evidence.maxWindSpeedKmh,
    evidence.windDirectionDeg,
    evidence.precipitationTotalMm,
    evidence.temperatureTrendC,
    evidence.windSpeedTrendKmh,
    evidence.pressureTrendHpa,
  ]
  if (!evidenceFigures.every(isNumberOrNull)) return null

  const rawVerdicts = value.verdicts
  if (!isRecord(rawVerdicts)) return null

  const verdicts: Partial<Record<HazardKey, HazardVerdictView>> = {}
  for (const [hazard, verdict] of Object.entries(rawVerdicts)) {
    if (!isHazardKey(hazard)) return null
    const parsed = parseVerdict(verdict)
    if (!parsed) return null
    verdicts[hazard] = parsed
  }

  return {
    cityKey: value.cityKey,
    status,
    forecastReferenceTime: value.forecastReferenceTime,
    fetchedAt: value.fetchedAt,
    source: value.source,
    licence: value.licence,
    evidence: {
      windowHours: evidence.windowHours,
      windowStart: evidence.windowStart,
      windowEnd: evidence.windowEnd,
      maxTemperatureC: evidence.maxTemperatureC as number | null,
      minTemperatureC: evidence.minTemperatureC as number | null,
      maxWindSpeedKmh: evidence.maxWindSpeedKmh as number | null,
      windDirectionDeg: evidence.windDirectionDeg as number | null,
      precipitationTotalMm: evidence.precipitationTotalMm as number | null,
      temperatureTrendC: evidence.temperatureTrendC as number | null,
      windSpeedTrendKmh: evidence.windSpeedTrendKmh as number | null,
      pressureTrendHpa: evidence.pressureTrendHpa as number | null,
    },
    verdicts,
  }
}

/** Validates the whole `{ brief, assessment }` envelope, or rejects it. */
export function parseBriefEnvelope(payload: unknown): BriefParseResult {
  if (!isRecord(payload)) return { ok: false, reason: 'malformed-response' }

  const brief = parseBrief(payload.brief)
  const assessment = parseAssessment(payload.assessment)

  if (!brief || !assessment) return { ok: false, reason: 'malformed-response' }

  return { ok: true, data: { brief, assessment } }
}
