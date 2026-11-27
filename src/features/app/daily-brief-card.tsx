import {
  AlertTriangle,
  CloudRain,
  Gauge,
  Loader2,
  RotateCw,
  Sparkles,
  Thermometer,
  Wind,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requestDailyBrief } from '@/lib/brief/brief-api'
import type {
  BriefFallbackReason,
  DailyBriefResponse,
  HazardKey,
  HazardVerdictView,
  RiskAssessmentStatus,
  RiskEvidenceView,
} from '@/lib/brief/brief-contract'
import type { CityKey } from '@/lib/supabase/database.types'

const hazardLabels: Record<HazardKey, string> = {
  flood: 'Flood',
  heat: 'Heat',
  storm: 'Storms',
  air_quality: 'Air quality',
  drought: 'Drought',
  coastal: 'Coastal',
}

const statusLabels: Record<RiskAssessmentStatus, string> = {
  ready: 'Assessment complete',
  incomplete: 'Partial data',
  stale: 'Outdated forecast',
  'no-data': 'No forecast',
}

/**
 * Explanations of why the engine's own text was used instead of model text.
 * Each is shown next to the "Deterministic brief" badge, so a reader always
 * knows which of the two produced the words on screen.
 */
const fallbackNotes: Record<BriefFallbackReason, string> = {
  'not-configured': 'No AI model is configured, so this brief was composed from the assessment alone.',
  'no-data': 'There was no forecast to brief from, so this text comes from the assessment alone.',
  'stale-data': 'The forecast is out of date, so this text comes from the assessment alone.',
  'incomplete-data': 'Some forecast inputs are incomplete, so this text comes from the assessment alone.',
  timeout: 'The AI brief did not arrive in time, so this text comes from the assessment alone.',
  'network-error': 'The AI service could not be reached, so this text comes from the assessment alone.',
  'rate-limited': 'The AI service was busy, so this text comes from the assessment alone.',
  'provider-error': 'The AI service returned an error, so this text comes from the assessment alone.',
  'invalid-response': 'The AI reply could not be validated, so it was discarded in favour of the assessment.',
  'unsafe-content': 'The AI reply broke the safety rules, so it was discarded in favour of the assessment.',
  'unsupported-figures': 'The AI reply cited figures the assessment does not contain, so it was discarded.',
}

const statusWarnings: Partial<Record<RiskAssessmentStatus, string>> = {
  'no-data':
    'No forecast has been ingested for this location, so nothing is classified. This is not a forecast of calm conditions.',
  stale:
    'The most recent stored forecast is older than expected. No hazard is classified from it, and the figures below are historical context only.',
  incomplete:
    'At least one forecast variable is under-sampled in this window. Any classification that depends on it is withheld.',
}

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; data: DailyBriefResponse }
  | { kind: 'error'; message: string }

function formatTime(iso: string | null): string {
  if (!iso) return '—'

  const date = new Date(iso)
  // A timestamp the engine could not parse is shown as absent rather than as
  // the literal text "Invalid Date".
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValue(value: number | null, digits: number, unit: string): string {
  return value === null ? '—' : `${value.toFixed(digits)} ${unit}`
}

function verdictSummary(verdict: HazardVerdictView): string {
  if (verdict.kind === 'classified') return verdict.label
  if (verdict.kind === 'below-threshold') return 'Below the published threshold'
  return 'Not assessed'
}

function verdictDetail(verdict: HazardVerdictView): string {
  if (verdict.kind === 'classified') {
    return `${verdict.observedKmh.toFixed(0)} km/h observed against a ${verdict.thresholdKmh.toFixed(0)} km/h threshold — ${verdict.source}.`
  }
  if (verdict.kind === 'below-threshold') {
    return `${verdict.observedKmh.toFixed(0)} km/h observed, below the ${verdict.thresholdKmh.toFixed(0)} km/h threshold — ${verdict.source}.`
  }
  return verdict.detail
}

function verdictBadgeVariant(verdict: HazardVerdictView) {
  if (verdict.kind === 'classified') return 'danger' as const
  if (verdict.kind === 'below-threshold') return 'signal' as const
  return 'muted' as const
}

function DailyBriefCard({ cityKey }: { cityKey: CityKey }) {
  const [attempt, setAttempt] = useState(0)
  const [entry, setEntry] = useState<{ key: string; value: State } | null>(null)

  const requestKey = `${cityKey}:${attempt}`

  useEffect(() => {
    let cancelled = false

    requestDailyBrief()
      .then((result) => {
        if (cancelled) return
        setEntry({
          key: requestKey,
          value: result.ok
            ? { kind: 'ready', data: result.data }
            : { kind: 'error', message: result.message },
        })
      })
      .catch(() => {
        if (cancelled) return
        setEntry({
          key: requestKey,
          value: {
            kind: 'error',
            message: 'The brief could not be loaded. Check your connection and retry.',
          },
        })
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  // Derived, not assigned: a retry or a location change must never show the
  // previous city's brief while the new request is still in flight.
  const state: State = entry && entry.key === requestKey ? entry.value : { kind: 'loading' }

  return (
    <Card className="mt-4 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            Daily brief{state.kind === 'ready' ? ` · ${state.data.brief.cityName}` : ''}
          </p>
          <h2 className="mt-2 font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
            Today at a glance
          </h2>
        </div>

        {state.kind === 'ready' ? <SourceBadges data={state.data} /> : null}
      </div>

      {state.kind === 'loading' ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-fog" role="status">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Preparing your brief…
        </p>
      ) : null}

      {state.kind === 'error' ? (
        <div className="mt-4 rounded-2xl border border-danger/25 bg-danger/[0.06] px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm text-danger-ink" role="alert">
            <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
            {state.message}
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={() => setAttempt((current) => current + 1)}
          >
            <RotateCw aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      {state.kind === 'ready' ? <BriefBody data={state.data} /> : null}
    </Card>
  )
}

function SourceBadges({ data }: { data: DailyBriefResponse }) {
  const { brief, assessment } = data

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {brief.source === 'groq' ? (
        <Badge variant="default">
          <Sparkles aria-hidden="true" className="size-3" />
          AI-written from the assessment
        </Badge>
      ) : (
        <Badge variant="outline">Deterministic brief</Badge>
      )}
      {assessment.status !== 'ready' ? (
        <Badge variant={assessment.status === 'no-data' ? 'muted' : 'outline'}>
          <AlertTriangle aria-hidden="true" className="size-3" />
          {statusLabels[assessment.status]}
        </Badge>
      ) : null}
    </div>
  )
}

function BriefBody({ data }: { data: DailyBriefResponse }) {
  const { brief, assessment } = data
  const warning = statusWarnings[assessment.status]
  // An unrecognised reason must not claim a cause it does not know.
  const fallbackNote =
    brief.fallbackReason && fallbackNotes[brief.fallbackReason]
      ? fallbackNotes[brief.fallbackReason]
      : 'This text comes from the assessment alone.'

  const sourceNote =
    brief.source === 'groq'
      ? 'The wording is written by a language model from the assessment below. It is not allowed to add figures or classifications of its own.'
      : fallbackNote

  return (
    <>
      <p className="mt-4 font-display text-xl font-semibold leading-snug tracking-[-0.02em] text-foreground">
        {brief.headline}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-fog">{brief.summary}</p>

      {brief.actions.length > 0 ? (
        <div className="mt-4">
          <p className="eyebrow">Suggested actions</p>
          <ul className="mt-2.5 grid gap-2">
            {brief.actions.map((action) => (
              <li
                key={action}
                className="flex gap-2.5 rounded-2xl border border-hairline bg-veil px-3 py-2.5 text-sm leading-relaxed text-fog"
              >
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-[0.65rem] leading-relaxed text-haze">
        {sourceNote}
        {brief.source === 'groq' && brief.model ? ` Model: ${brief.model}.` : ''}
      </p>

      {warning ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-heat/30 bg-heat/[0.07] px-3.5 py-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-heat-ink" />
          <p className="text-xs leading-relaxed text-fog">{warning}</p>
        </div>
      ) : null}

      <div className="mt-6 border-t border-hairline pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="eyebrow">Risk assessment</p>
          <p className="text-[0.65rem] text-haze">
            {assessment.status === 'ready' ? statusLabels.ready : statusLabels[assessment.status]} ·
            next {assessment.evidence.windowHours} h
          </p>
        </div>

        <EvidenceGrid evidence={assessment.evidence} />
        <VerdictList verdicts={assessment.verdicts} />
      </div>

      <p className="mt-5 border-t border-hairline pt-4 text-[0.65rem] leading-relaxed text-haze">
        Assessment derived from {assessment.source ?? 'the stored forecast'}
        {assessment.licence ? ` (${assessment.licence})` : ''}
        {assessment.forecastReferenceTime
          ? `, model run ${formatTime(assessment.forecastReferenceTime)}`
          : ''}
        {assessment.fetchedAt ? `, fetched ${formatTime(assessment.fetchedAt)}` : ''}. Modelled
        values, not observations; no warranty and no implied endorsement by the data provider.
        Only wind is classified in this build; other hazards are left unassessed rather than
        estimated.
      </p>
    </>
  )
}

function EvidenceGrid({ evidence }: { evidence: RiskEvidenceView }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Metric
        icon={<Thermometer aria-hidden="true" className="size-4" />}
        label="Temperature range"
        value={
          evidence.minTemperatureC !== null && evidence.maxTemperatureC !== null
            ? `${evidence.minTemperatureC.toFixed(0)}–${evidence.maxTemperatureC.toFixed(0)} °C`
            : '—'
        }
      />
      <Metric
        icon={<Wind aria-hidden="true" className="size-4" />}
        label="Peak wind"
        value={formatValue(evidence.maxWindSpeedKmh, 0, 'km/h')}
      />
      <Metric
        icon={<CloudRain aria-hidden="true" className="size-4" />}
        label="Rainfall total"
        value={formatValue(evidence.precipitationTotalMm, 1, 'mm')}
      />
      <Metric
        icon={<Gauge aria-hidden="true" className="size-4" />}
        label="Pressure trend"
        value={formatTrend(evidence.pressureTrendHpa, 'hPa')}
      />
    </dl>
  )
}

function formatTrend(value: number | null, unit: string): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} ${unit}`
}

function VerdictList({
  verdicts,
}: {
  verdicts: Partial<Record<HazardKey, HazardVerdictView>>
}) {
  const entries = Object.entries(verdicts) as [HazardKey, HazardVerdictView][]

  if (entries.length === 0) {
    return <p className="mt-3 text-sm text-fog">No hazard was assessed for this window.</p>
  }

  return (
    <ul className="mt-3 grid gap-2">
      {entries.map(([hazard, verdict]) => (
        <li
          key={hazard}
          className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 rounded-2xl border border-hairline bg-veil px-3.5 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{hazardLabels[hazard]}</p>
            <p className="mt-1 text-xs leading-relaxed text-fog">{verdictDetail(verdict)}</p>
          </div>
          <Badge variant={verdictBadgeVariant(verdict)}>{verdictSummary(verdict)}</Badge>
        </li>
      ))}
    </ul>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-veil px-3 py-3">
      <div className="flex items-center gap-1.5 text-haze">
        {icon}
        <span className="text-[0.62rem] uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

export { DailyBriefCard }
