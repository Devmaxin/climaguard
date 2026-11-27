/**
 * Pure core of the Daily Climate Brief.
 *
 * Everything that decides *what the brief says* lives here, so it can be tested
 * without a running edge runtime, a database or a network. `index.ts` supplies
 * the authenticated request, the rows and the HTTP transport.
 *
 * DIVISION OF AUTHORITY
 *   The deterministic risk engine decides every fact and every classification.
 *   Groq receives that finished assessment and may only restate it in prose and
 *   suggest ordinary, non-emergency actions. It never sees a raw forecast row,
 *   never returns a severity, and any output that breaks those rules is
 *   discarded in favour of the deterministic brief below.
 */

import { assessRisk, type AssessOptions } from '../_shared/risk/risk-engine.ts'
import type { ClimateSnapshot, RiskAssessment } from '../_shared/risk/types.ts'
import type {
  CityKey,
  ClimateUnit,
  ClimateVariable,
  HazardInterest,
} from '../../../src/lib/supabase/database.types.ts'

export type ForecastRow = {
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

export type DailyBrief = {
  cityKey: CityKey
  cityName: string
  headline: string
  summary: string
  actions: string[]
  /** `groq` only when a validated model response was accepted. */
  source: 'groq' | 'deterministic'
  model: string | null
  /** Why the deterministic path was taken; absent for `groq`. */
  fallbackReason?: BriefFallbackReason
}

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

const HEADLINE_MAX = 90
const SUMMARY_MAX = 320
const ACTION_MAX = 110
const MAX_ACTIONS = 3

/* ------------------------------------------------------------------ */
/* Snapshot assembly                                                    */
/* ------------------------------------------------------------------ */

/**
 * Rebuilds the same snapshot the dashboard sees: the newest model run, and
 * only those rows. Returns null when nothing has been ingested so the engine
 * can report `no-data` honestly.
 */
export function buildSnapshot(cityKey: CityKey, rows: ForecastRow[]): ClimateSnapshot | null {
  if (rows.length === 0) return null

  // Newest *parseable* reference wins. A row whose reference cannot be parsed
  // must never outrank a real one, and when nothing parses the first row's
  // value is kept so the engine can report it as stale rather than have this
  // function invent a time.
  let referenceTime = rows[0].forecast_reference_time
  let newest = Date.parse(referenceTime)

  for (const row of rows) {
    const parsed = Date.parse(row.forecast_reference_time)
    if (!Number.isFinite(parsed)) continue
    if (Number.isFinite(newest) && parsed <= newest) continue
    referenceTime = row.forecast_reference_time
    newest = parsed
  }

  const latest = rows.filter((row) => row.forecast_reference_time === referenceTime)

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

/** Snapshot assembly plus the existing deterministic engine, in one step. */
export function assembleAssessment(
  cityKey: CityKey,
  rows: ForecastRow[],
  options: AssessOptions = {},
): RiskAssessment {
  return assessRisk(cityKey, buildSnapshot(cityKey, rows), options)
}

/* ------------------------------------------------------------------ */
/* Deterministic brief                                                  */
/* ------------------------------------------------------------------ */

/**
 * Display names only. The application's richer city metadata is not imported
 * here because the function bundle cannot reach outside its own directory.
 */
const CITY_NAMES: Record<CityKey, string> = {
  lagos: 'Lagos',
  metro_manila: 'Metro Manila',
  dhaka: 'Dhaka',
}

function cityNameOf(cityKey: CityKey): string {
  return CITY_NAMES[cityKey] ?? 'your city'
}

function stormVerdict(assessment: RiskAssessment) {
  const verdict = assessment.verdicts.storm
  return verdict && verdict.kind === 'classified' ? verdict : null
}

/**
 * The brief produced with no model at all. It states only what the engine
 * measured, and never asserts a hazard the engine declined to classify.
 */
export function composeDeterministicBrief(assessment: RiskAssessment): DailyBrief {
  const cityName = cityNameOf(assessment.cityKey)
  const base = {
    cityKey: assessment.cityKey,
    cityName,
    source: 'deterministic' as const,
    model: null,
  }

  if (assessment.status === 'no-data') {
    return {
      ...base,
      headline: `No forecast for ${cityName} yet`,
      summary:
        'No forecast has been ingested for this location, so there is nothing to brief. Rather than estimate conditions, this brief stays empty.',
      actions: ['Check back after the next scheduled forecast update.'],
      fallbackReason: 'no-data',
    }
  }

  if (assessment.status === 'stale') {
    return {
      ...base,
      headline: `Forecast for ${cityName} is out of date`,
      summary:
        'The most recent stored forecast is older than expected, so no risk classification is made from it. The underlying figures are shown as historical context only.',
      actions: ['Treat the current figures as historical until the next update.'],
      fallbackReason: 'stale-data',
    }
  }

  const { evidence } = assessment
  const parts: string[] = []

  if (evidence.maxTemperatureC !== null && evidence.minTemperatureC !== null) {
    parts.push(
      `Temperature ranges from ${evidence.minTemperatureC.toFixed(0)} to ${evidence.maxTemperatureC.toFixed(0)} °C over the next ${evidence.windowHours} hours.`,
    )
  }
  if (evidence.maxWindSpeedKmh !== null) {
    parts.push(`Peak wind is ${evidence.maxWindSpeedKmh.toFixed(0)} km/h.`)
  }
  if (evidence.precipitationTotalMm !== null) {
    parts.push(`Rainfall totals ${evidence.precipitationTotalMm.toFixed(1)} mm.`)
  }

  const storm = stormVerdict(assessment)
  const coverageNote =
    assessment.status === 'incomplete'
      ? ' Some forecast variables are incomplete, so classifications that depend on them are withheld.'
      : ''

  const headline = storm
    ? `${storm.label} expected in ${cityName}`
    : `Conditions for ${cityName} over the next ${evidence.windowHours} hours`

  const actions = storm
    ? ['Secure loose outdoor items before the wind strengthens.', 'Follow local official advice if conditions change.']
    : ['Keep an eye on the next forecast update before making plans.']

  return {
    ...base,
    headline,
    summary: `${parts.join(' ')}${coverageNote}`.trim(),
    actions,
    ...(assessment.status === 'incomplete' ? { fallbackReason: 'incomplete-data' as const } : {}),
  }
}

/* ------------------------------------------------------------------ */
/* Guardrails                                                           */
/* ------------------------------------------------------------------ */

/**
 * Claims the model may never make. Each pattern is a category we refuse to
 * inflate: emergency declarations, medical direction, or a flood or health
 * verdict the deterministic engine deliberately does not produce.
 */
const FORBIDDEN_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: 'emergency', pattern: /\b(emergency|evacuat\w*|state of emergency|disaster)\b/i },
  { id: 'authority', pattern: /\b(call|dial|contact)\s+(911|112|999)\b|\bpolice\b|\bcivil defence\b/i },
  { id: 'medical', pattern: /\b(diagnos\w*|medication|prescription|medical advice|symptoms?)\b/i },
  { id: 'flood-claim', pattern: /\bflood(ing|s)?\s+(risk|warning|is (likely|expected|imminent))\b/i },
  { id: 'certainty', pattern: /\b(will certainly|guaranteed|certain to happen|no doubt)\b/i },
  {
    id: 'emergency-instruction',
    pattern: new RegExp(
      [
        // take/seek/find/get (to) shelter, take cover
        String.raw`\b(?:take|seek|find|get|reach|move)\s+(?:[a-z]+\s+){0,2}(?:shelter|cover)\b`,
        // stay/remain inside, indoors, in place
        String.raw`\b(?:stay|remain|keep)\s+(?:[a-z]+\s+)?(?:inside|indoors|in\s+place|where\s+you\s+are)\b`,
        String.raw`\bshelter(?:ing)?[\s-]+in[\s-]+place\b`,
        // do not / don't go outside, leave the house
        String.raw`\bdo(?:n['’]?t|\s+not)\s+(?:[a-z]+\s+)?(?:go|leave|venture|step|head)\s+(?:[a-z]+\s+)?(?:outside|outdoors|out|home|the\s+house|your\s+home)\b`,
        String.raw`\bdo(?:n['’]?t|\s+not)\s+leave\s+(?:the\s+|your\s+)?(?:house|home|building)\b`,
        String.raw`\bshelter\s+(?:immediately|now|at\s+once|as\s+soon\s+as\s+possible)\b`,
      ].join('|'),
      'i',
    ),
  },
]

export function findForbiddenContent(text: string): string | null {
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(text)) return rule.id
  }
  return null
}

/**
 * Escalation words assert a risk level, which only the deterministic engine
 * may do. They are legitimate only where the engine's own wording already uses
 * them — a Beaufort 9 run is literally a "Severe gale" — so the classified
 * labels are removed before the check. Used anywhere else, a mere mention of a
 * hazard included, they claim a severity the assessment never made.
 */
const ESCALATION_PATTERNS: { id: string; pattern: RegExp }[] = [
  {
    id: 'severity-escalation',
    pattern: /\b(severe|extreme|dangerous|high[\s-]risk|serious risk|critical)\b/i,
  },
  { id: 'alerting', pattern: /\b(alert|alerts|warning|warnings|advisory|watch)\b/i },
]

/**
 * A storm-tier name is itself a classification, whether or not it is written
 * with a force suffix: "a gale is expected" claims as much as "gale-force".
 * Each tier is allowed only when the deterministic storm verdict has reached
 * it. `minBeaufort` restates the tier boundaries the engine already owns in
 * `_shared/risk/thresholds`; the engine stays the only authority that decides.
 *
 * Order matters: the longest name for a tier is tested first so that "near
 * gale" is read as Beaufort 7 rather than as an ordinary gale at Beaufort 8.
 */
const STORM_TIER_CLAIMS: { id: string; pattern: RegExp; minBeaufort: number }[] = [
  { id: 'storm-escalation', pattern: /\bviolent\s+storms?\b/, minBeaufort: 11 },
  { id: 'storm-escalation', pattern: /\b(?:hurricanes?|typhoons?)\b/, minBeaufort: 12 },
  { id: 'storm-escalation', pattern: /\bsevere\s+gales?\b/, minBeaufort: 9 },
  { id: 'storm-escalation', pattern: /\bnear[\s-]+gales?\b/, minBeaufort: 7 },
  { id: 'storm-escalation', pattern: /\bstrong\s+breezes?\b/, minBeaufort: 6 },
  { id: 'storm-escalation', pattern: /\bgales?\b/, minBeaufort: 8 },
  { id: 'storm-escalation', pattern: /\bstorms?\b/, minBeaufort: 10 },
]

/** Dashes, curly quotes and runs of whitespace are ordinary prose variations. */
function normaliseProse(text: string): string {
  return text.replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim()
}

function stripLiteral(text: string, literal: string): string {
  if (literal.length === 0) return text
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), ' ')
}

/**
 * A storm-tier claim's required level, where the tier names overlap ("severe
 * gale" also contains "gale"). Returns null when the text makes no tier claim.
 */
function strongestStormClaim(text: string): number | null {
  let remaining = text
  let strongest: number | null = null

  for (const claim of STORM_TIER_CLAIMS) {
    const pattern = new RegExp(claim.pattern.source, 'gi')
    if (!pattern.test(remaining)) continue
    strongest = Math.max(strongest ?? 0, claim.minBeaufort)
    // Claimed here, so it must not be counted again as the shorter tier name it
    // contains: "near gale" is Beaufort 7, not Beaufort 7 plus an ordinary gale.
    remaining = remaining.replace(pattern, ' ')
  }

  return strongest
}

export function findUnsupportedEscalation(text: string, assessment: RiskAssessment): string | null {
  const prose = normaliseProse(text)

  // Tier claims are judged on the untouched prose, before any label is removed:
  // stripping the engine's own label used to erase the word "storm" out of a
  // fabricated "violent storm", leaving nothing to reject.
  const required = strongestStormClaim(prose)
  if (required !== null) {
    const storm = stormVerdict(assessment)
    if (storm === null || storm.beaufort < required) return 'storm-escalation'
  }

  // The engine's own classified labels are legitimate wording ("Severe gale"),
  // so they are removed before the generic severity words are checked.
  let remaining = prose
  for (const verdict of Object.values(assessment.verdicts)) {
    if (verdict?.kind !== 'classified') continue
    remaining = stripLiteral(remaining, verdict.label)
    remaining = stripLiteral(remaining, verdict.label.split('(')[0].trim())
  }

  for (const rule of ESCALATION_PATTERNS) {
    if (rule.pattern.test(remaining)) return rule.id
  }

  return null
}

const TEMPERATURE_UNITS = ['°C', 'C']
const WIND_UNITS = ['km/h']

/**
 * Values the model may restate. Absolute evidence and signed trends are kept
 * apart: a 1 °C trend magnitude must never authorise an absolute 1 °C claim.
 */
export type FigureAllowlist = {
  absolute: Set<string>
  trends: Set<string>
  bare: Set<string>
  beaufort: number | null
}

/**
 * Every unit-bearing figure the model may cite, rendered from the assessment
 * itself. Built as strings in the same formats the brief uses, so a model that
 * restates the evidence matches, while an invented value does not.
 */
export function allowedFigures(assessment: RiskAssessment): FigureAllowlist {
  const allowlist: FigureAllowlist = {
    absolute: new Set<string>(),
    trends: new Set<string>(),
    bare: new Set<string>(),
    beaufort: stormVerdict(assessment)?.beaufort ?? null,
  }

  const add = (target: Set<string>, value: number, digits: number, units: string[]) => {
    const text = value.toFixed(digits)
    for (const unit of units) target.add(`${text} ${unit}`)
  }

  const { evidence } = assessment
  if (evidence.maxTemperatureC !== null) add(allowlist.absolute, evidence.maxTemperatureC, 0, TEMPERATURE_UNITS)
  if (evidence.minTemperatureC !== null) add(allowlist.absolute, evidence.minTemperatureC, 0, TEMPERATURE_UNITS)
  if (evidence.maxWindSpeedKmh !== null) add(allowlist.absolute, evidence.maxWindSpeedKmh, 0, WIND_UNITS)
  if (evidence.precipitationTotalMm !== null) add(allowlist.absolute, evidence.precipitationTotalMm, 1, ['mm'])
  if (evidence.windDirectionDeg !== null) add(allowlist.absolute, evidence.windDirectionDeg, 0, ['°'])

  if (evidence.temperatureTrendC !== null) add(allowlist.trends, evidence.temperatureTrendC, 0, TEMPERATURE_UNITS)
  if (evidence.windSpeedTrendKmh !== null) add(allowlist.trends, evidence.windSpeedTrendKmh, 0, WIND_UNITS)
  if (evidence.pressureTrendHpa !== null) add(allowlist.trends, evidence.pressureTrendHpa, 0, ['hPa', 'mb'])

  allowlist.bare.add(String(evidence.windowHours))
  return allowlist
}

/**
 * Unit spellings that describe the same physical unit. Anything the assessment
 * does not supply in that unit — mph, °F, m/s, knots, percentages — has no
 * entry to match, so it is rejected rather than quietly accepted.
 */
const UNIT_ALIASES: Record<string, string> = {
  '°c': 'degC',
  c: 'degC',
  degc: 'degC',
  celsius: 'degC',
  '°f': 'degF',
  f: 'degF',
  degf: 'degF',
  fahrenheit: 'degF',
  'km/hr': 'kmh',
  'km/h': 'kmh',
  kmh: 'kmh',
  kph: 'kmh',
  mph: 'mph',
  'm/s': 'ms',
  mps: 'ms',
  knots: 'kn',
  knot: 'kn',
  kt: 'kn',
  kn: 'kn',
  mm: 'mm',
  hpa: 'hpa',
  mb: 'hpa',
  '%': 'pct',
  percent: 'pct',
  percentage: 'pct',
  '°': 'deg',
  degrees: 'deg',
  degree: 'deg',
  deg: 'deg',
}

function canonicalUnit(raw: string): string | null {
  return UNIT_ALIASES[raw.trim().toLowerCase()] ?? null
}

/** Longest spellings first, so `km/hr` is not read as `km/h`. */
const FIGURE_PATTERN =
  /(-?\d+(?:\.\d+)?)\s*(°C|°F|degC|degF|celsius|fahrenheit|km\/hr|km\/h|kmh|kph|mph|m\/s|mps|knots|knot|kt|kn|mm|hPa|mb|percent|percentage|%|°|degrees|degree|deg|C|F)(?![\w/])/gi

const BEAUFORT_PATTERN = /\b(?:beaufort|bft)\s+(\d+(?:\.\d+)?)\b/gi

type AllowedFigure = { value: number; unit: string }

function allowedFigureEntries(allowed: Set<string>): AllowedFigure[] {
  const entries: AllowedFigure[] = []

  for (const candidate of allowed) {
    const match = /^(-?\d+(?:\.\d+)?)\s*(.+)$/.exec(candidate)
    if (!match) continue

    const unit = canonicalUnit(match[2])
    if (unit === null) continue

    entries.push({ value: Number(match[1]), unit })
  }

  return entries
}

function containsFigure(entries: AllowedFigure[], value: number, unit: string): boolean {
  return entries.some((entry) => entry.unit === unit && Math.abs(entry.value - value) < 1e-6)
}

/**
 * Whether the sentence is stating a *change* rather than a level, and in which
 * direction. Only phrasing that names a change counts: "a fall of 1 °C" and
 * "the temperature fall of 1 °C" are changes, while "temperatures fall to
 * 1 °C" states a level and stays an absolute claim.
 */
function trendDirection(before: string, after: string): 'fall' | 'rise' | null {
  const amount = String.raw`\s*(?:of|by)\s+(?:about\s+|around\s+|roughly\s+|nearly\s+|approximately\s+)?`

  if (
    new RegExp(
      String.raw`\b(?:fall(?:ing|s)?|fell|drop(?:ped|s|ping)?|decreas(?:e|ed|es|ing)|declin(?:e|ed|es|ing)|cool(?:er|ing)?|lower)${amount}$`,
      'i',
    ).test(before)
  ) {
    return 'fall'
  }
  if (
    new RegExp(
      String.raw`\b(?:rise|rises|rising|rose|increas(?:e|ed|es|ing)|climb(?:ed|s|ing)?|warm(?:er|ing)?|higher)${amount}$`,
      'i',
    ).test(before)
  ) {
    return 'rise'
  }

  const afterWord = String.raw`^\s*(?:[a-z]+\s+){0,2}`
  if (
    new RegExp(
      String.raw`${afterWord}(?:of\s+)?(?:fall(?:ing|s)?|fell|drop(?:ped|s|ping)?|decreas(?:e|ed|es|ing)|declin(?:e|ed|es|ing)|cooling|lower)\b`,
      'i',
    ).test(after)
  ) {
    return 'fall'
  }
  if (
    new RegExp(
      String.raw`${afterWord}(?:of\s+)?(?:rise|rises|rising|rose|increas(?:e|ed|es|ing)|climb(?:ed|s|ing)?|warming|warmer|higher)\b`,
      'i',
    ).test(after)
  ) {
    return 'rise'
  }

  return null
}

/**
 * A trend is signed, so the sentence's direction and the measured sign must
 * agree: "a fall of 1 °C" restates −1 °C and "a rise of 1 °C" restates +1 °C.
 * A trend figure is never accepted as an absolute measurement, and an absolute
 * measurement never stands in for a trend — a "fall of 16 km/h" is not
 * authorised by a 16 km/h peak wind.
 */
function matchesTrend(entries: AllowedFigure[], value: number, unit: string, direction: 'fall' | 'rise'): boolean {
  const signed = direction === 'fall' ? -Math.abs(value) : Math.abs(value)
  return containsFigure(entries, signed, unit)
}

function isInside(spans: { start: number; end: number }[], index: number): boolean {
  return spans.some((span) => index >= span.start && index < span.end)
}

/**
 * Figures stated with a physical unit that the assessment does not contain.
 * Matching is numeric and unit-aware, so a faithful restatement is accepted
 * however it is formatted, while a different value, a different sign, or the
 * same value in a unit the assessment never used, is rejected. A second pass
 * rejects numeric claims whose unit the pattern does not recognise at all.
 */
export function findUnsupportedFigures(text: string, allowed: FigureAllowlist): string | null {
  const absolute = allowedFigureEntries(allowed.absolute)
  const trends = allowedFigureEntries(allowed.trends)
  const spans: { start: number; end: number }[] = []

  const beaufort = new RegExp(BEAUFORT_PATTERN.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = beaufort.exec(text)) !== null) {
    spans.push({ start: match.index, end: match.index + match[0].length })
    if (allowed.beaufort === null || Math.abs(allowed.beaufort - Number(match[1])) > 1e-6) {
      return `Beaufort ${match[1]}`
    }
  }

  const pattern = new RegExp(FIGURE_PATTERN.source, 'gi')
  while ((match = pattern.exec(text)) !== null) {
    spans.push({ start: match.index, end: match.index + match[0].length })

    const value = Number(match[1])
    const unit = canonicalUnit(match[2])
    const before = text.slice(Math.max(0, match.index - 32), match.index)
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 32)
    const direction = trendDirection(before, after)

    // A change claim is validated against the trends only, and a level claim
    // against the absolutes only, so neither can authorise the other.
    let supported = false
    if (unit !== null) {
      if (direction !== null) supported = matchesTrend(trends, value, unit, direction)
      else supported = containsFigure(absolute, value, unit) || (value < 0 && containsFigure(trends, value, unit))
    }

    if (!supported) return `${match[1]} ${match[2]}`
  }

  // Anything numeric the unit pattern could not classify is not evidence either.
  const numbers = /-?\d+(?:\.\d+)?/g
  while ((match = numbers.exec(text)) !== null) {
    if (isInside(spans, match.index)) continue
    if (allowed.bare.has(match[0])) continue
    if (allowed.beaufort !== null && match[0] === String(allowed.beaufort)) continue
    return match[0]
  }

  return null
}

/* ------------------------------------------------------------------ */
/* Groq request and response                                            */
/* ------------------------------------------------------------------ */

export type GroqEnv = {
  apiKey?: string
  model?: string
}

export type GroqRequestInit = {
  method: string
  headers: Record<string, string>
  body: string
  signal?: AbortSignal
}

export type GroqResponseLike = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

export type GroqTransport = (url: string, init: GroqRequestInit) => Promise<GroqResponseLike>

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = [
  'You write one short daily climate brief from a precomputed risk assessment.',
  '',
  'Hard rules:',
  '- Use only the figures in the assessment. Never invent, round off into new numbers, or forecast anything.',
  '- The assessment is the only authority on risk. Restate its verdicts exactly; never raise, lower or add a risk level of your own.',
  '- Hazards marked unclassified must be described as not assessed. Only a hazard the assessment classifies may be described at all.',
  '- Do not use the words severe, extreme, dangerous, critical, high risk, alert, warning or emergency, except where the assessment\'s own verdict label already uses them.',
  '- Never declare an emergency, tell anyone to evacuate, or give medical advice.',
  '- Never mention flooding as a risk, danger or likelihood.',
  '- Keep a calm, factual, practical tone.',
  '',
  'Reply with JSON only, no markdown, matching:',
  '{"headline": string (max 90 chars), "summary": string (max 320 chars), "actions": string[] (1-3 items, each max 110 chars)}',
].join('\n')

/** The user turn: the assessment, serialised without any personal data. */
export function buildAssessmentContext(assessment: RiskAssessment) {
  return {
    city: cityNameOf(assessment.cityKey),
    status: assessment.status,
    window_hours: assessment.evidence.windowHours,
    evidence: {
      max_temperature_c: assessment.evidence.maxTemperatureC,
      min_temperature_c: assessment.evidence.minTemperatureC,
      max_wind_speed_kmh: assessment.evidence.maxWindSpeedKmh,
      wind_direction_deg: assessment.evidence.windDirectionDeg,
      precipitation_total_mm: assessment.evidence.precipitationTotalMm,
      temperature_trend_c: assessment.evidence.temperatureTrendC,
      wind_speed_trend_kmh: assessment.evidence.windSpeedTrendKmh,
      pressure_trend_hpa: assessment.evidence.pressureTrendHpa,
    },
    hazard_verdicts: assessment.verdicts,
  }
}

export function buildGroqRequest(assessment: RiskAssessment, model: string, apiKey: string): GroqRequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Assessment:\n${JSON.stringify(buildAssessmentContext(assessment), null, 2)}`,
        },
      ],
    }),
  }
}

function stripCodeFence(content: string): string {
  const trimmed = content.trim()
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed)
  return fenced ? fenced[1].trim() : trimmed
}

export type ParsedBrief = { headline: string; summary: string; actions: string[] }

/**
 * Validates the model's JSON. Anything unexpected is rejected outright rather
 * than coerced, so a malformed reply can never reach a person as a brief.
 */
export function parseBriefContent(content: string): ParsedBrief | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripCodeFence(content))
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

  const record = parsed as Record<string, unknown>
  const { headline, summary, actions } = record

  if (typeof headline !== 'string' || headline.trim().length === 0) return null
  if (headline.length > HEADLINE_MAX) return null
  if (typeof summary !== 'string' || summary.trim().length === 0) return null
  if (summary.length > SUMMARY_MAX) return null
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_ACTIONS) return null

  const cleanedActions: string[] = []
  for (const action of actions) {
    if (typeof action !== 'string') return null
    const trimmed = action.trim()
    if (trimmed.length === 0 || trimmed.length > ACTION_MAX) return null
    cleanedActions.push(trimmed)
  }

  return { headline: headline.trim(), summary: summary.trim(), actions: cleanedActions }
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                        */
/* ------------------------------------------------------------------ */

export type GenerateBriefParams = {
  assessment: RiskAssessment
  env: GroqEnv
  transport?: GroqTransport
  timeoutMs?: number
}

function deterministicFallback(assessment: RiskAssessment, reason: BriefFallbackReason): DailyBrief {
  return { ...composeDeterministicBrief(assessment), fallbackReason: reason }
}

/**
 * Produces the brief. The model is attempted only when it is configured and
 * the assessment can support a brief at all; every failure path returns the
 * deterministic brief with a reason instead of an error.
 */
export async function generateBrief({
  assessment,
  env,
  transport = ((url, init) => fetch(url, init)) as GroqTransport,
  timeoutMs = 8000,
}: GenerateBriefParams): Promise<DailyBrief> {
  const apiKey = env.apiKey?.trim()
  const model = env.model?.trim()

  if (!apiKey || !model) return deterministicFallback(assessment, 'not-configured')
  if (assessment.status === 'no-data') return deterministicFallback(assessment, 'no-data')
  if (assessment.status === 'stale') return deterministicFallback(assessment, 'stale-data')

  let response: GroqResponseLike
  try {
    response = await transport(
      GROQ_ENDPOINT,
      { ...buildGroqRequest(assessment, model, apiKey), signal: AbortSignal.timeout(timeoutMs) },
    )
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    return deterministicFallback(assessment, name === 'AbortError' || name === 'TimeoutError' ? 'timeout' : 'network-error')
  }

  if (response.status === 429) return deterministicFallback(assessment, 'rate-limited')
  if (!response.ok) return deterministicFallback(assessment, 'provider-error')

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return deterministicFallback(assessment, 'invalid-response')
  }

  const content = extractContent(payload)
  if (content === null) return deterministicFallback(assessment, 'invalid-response')

  const brief = parseBriefContent(content)
  if (!brief) return deterministicFallback(assessment, 'invalid-response')

  const combined = `${brief.headline} ${brief.summary} ${brief.actions.join(' ')}`
  if (findForbiddenContent(combined)) return deterministicFallback(assessment, 'unsafe-content')
  if (findUnsupportedEscalation(combined, assessment)) {
    return deterministicFallback(assessment, 'unsafe-content')
  }
  if (findUnsupportedFigures(combined, allowedFigures(assessment))) {
    return deterministicFallback(assessment, 'unsupported-figures')
  }

  return {
    cityKey: assessment.cityKey,
    cityName: cityNameOf(assessment.cityKey),
    headline: brief.headline,
    summary: brief.summary,
    actions: brief.actions,
    source: 'groq',
    model,
  }
}

function extractContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null

  const choices = (payload as Record<string, unknown>).choices
  if (!Array.isArray(choices) || choices.length === 0) return null

  const first = choices[0]
  if (typeof first !== 'object' || first === null) return null

  const message = (first as Record<string, unknown>).message
  if (typeof message !== 'object' || message === null) return null

  const content = (message as Record<string, unknown>).content
  return typeof content === 'string' ? content : null
}

/** Hazards to report on for a user, defaulting to everything the engine knows. */
export function hazardsFrom(preferences: { hazard_interests?: HazardInterest[] } | null): HazardInterest[] | undefined {
  const interests = preferences?.hazard_interests
  return interests && interests.length > 0 ? interests : undefined
}
