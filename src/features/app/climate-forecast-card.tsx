import { AlertTriangle, CloudRain, Gauge, Loader2, Thermometer, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  closestPoint,
  fetchClimateSnapshot,
  isStale,
  seriesFrom,
  type ClimatePoint,
  type ClimateSnapshot,
} from '@/lib/climate/climate-api'
import type { CityKey } from '@/lib/supabase/database.types'

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
]

function compass(degrees: number): string {
  return COMPASS[Math.round(((degrees % 360) / 22.5)) % 16]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' })
}

/** Precipitation is shown per interval; it is never a probability. */
function precipitationLabel(point: ClimatePoint | null): string {
  if (!point) return '—'
  return `${point.value.toFixed(1)} mm`
}

type Status =
  | { kind: 'loading' }
  | { kind: 'ready'; snapshot: ClimateSnapshot }
  | { kind: 'empty' }
  | { kind: 'unavailable'; message: string }

function ClimateForecastCard({ cityKey, cityName }: { cityKey: CityKey; cityName: string }) {
  const [entry, setEntry] = useState<{ cityKey: CityKey; value: Status } | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchClimateSnapshot(cityKey)
      .then((snapshot) => {
        if (cancelled) return
        setEntry({
          cityKey,
          value: snapshot ? { kind: 'ready', snapshot } : { kind: 'empty' },
        })
      })
      .catch(() => {
        if (cancelled) return
        setEntry({
          cityKey,
          value: { kind: 'unavailable', message: 'Forecast data is unavailable right now.' },
        })
      })

    return () => {
      cancelled = true
    }
  }, [cityKey])

  // Loading is derived, not assigned: an entry for a previous city must never
  // be shown while the current one is still being fetched.
  const status: Status =
    entry && entry.cityKey === cityKey ? entry.value : { kind: 'loading' }

  return (
    <Card className="mt-4 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Forecast · {cityName}</p>
          <h2 className="mt-2 font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
            Next 72 hours
          </h2>
        </div>

        {status.kind === 'ready' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">Model run {formatTime(status.snapshot.referenceTime)}</Badge>
            {isStale(status.snapshot.referenceTime) ? (
              <Badge variant="outline">
                <AlertTriangle aria-hidden="true" className="size-3" />
                Stale
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      {status.kind === 'loading' ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-fog" role="status">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Loading forecast…
        </p>
      ) : null}

      {status.kind === 'empty' ? (
        <p className="mt-4 text-sm leading-relaxed text-fog">
          No forecast has been ingested for {cityName} yet. Rather than show placeholder numbers,
          this panel stays empty until real ECMWF data lands.
        </p>
      ) : null}

      {status.kind === 'unavailable' ? (
        <p className="mt-4 text-sm leading-relaxed text-danger-ink" role="alert">
          {status.message}
        </p>
      ) : null}

      {status.kind === 'ready' ? <ForecastBody snapshot={status.snapshot} /> : null}
    </Card>
  )
}

function ForecastBody({ snapshot }: { snapshot: ClimateSnapshot }) {
  // Captured once per mount so the four metrics and the timeline agree on
  // "now" rather than re-reading the clock on every render.
  const [now] = useState(() => new Date())
  const temperature = closestPoint(snapshot.points, 'temperature_2m', now)
  const windSpeed = closestPoint(snapshot.points, 'wind_speed', now)
  const windDirection = closestPoint(snapshot.points, 'wind_direction', now)
  const pressure = closestPoint(snapshot.points, 'pressure_msl', now)
  const precipitation = closestPoint(snapshot.points, 'precipitation', now)

  const timeline = seriesFrom(snapshot.points, 'temperature_2m', now).slice(0, 8)
  const rainByStep = new Map(
    seriesFrom(snapshot.points, 'precipitation', now).map((point) => [
      point.validTime,
      point.value,
    ]),
  )

  return (
    <>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={<Thermometer aria-hidden="true" className="size-4" />}
          label="Temperature"
          value={temperature ? `${temperature.value.toFixed(1)} °C` : '—'}
          detail={temperature ? formatTime(temperature.validTime) : undefined}
        />
        <Metric
          icon={<Wind aria-hidden="true" className="size-4" />}
          label="Wind"
          value={windSpeed ? `${windSpeed.value.toFixed(0)} km/h` : '—'}
          detail={windDirection ? `from ${compass(windDirection.value)}` : undefined}
        />
        <Metric
          icon={<CloudRain aria-hidden="true" className="size-4" />}
          label="Precipitation"
          value={precipitationLabel(precipitation)}
          detail="in this 3-hour step"
        />
        <Metric
          icon={<Gauge aria-hidden="true" className="size-4" />}
          label="Pressure"
          value={pressure ? `${pressure.value.toFixed(0)} hPa` : '—'}
          detail={pressure ? formatTime(pressure.validTime) : undefined}
        />
      </dl>

      {timeline.length > 0 ? (
        <div className="mt-6 border-t border-hairline pt-4">
          <p className="eyebrow">Temperature outlook</p>
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {timeline.map((point) => (
              <li
                key={point.validTime}
                className="rounded-2xl border border-hairline bg-veil px-2 py-2.5 text-center"
              >
                <p className="text-[0.6rem] uppercase tracking-[0.1em] text-haze">
                  {formatDay(point.validTime)}
                </p>
                <p className="mt-0.5 text-xs text-fog">{formatTime(point.validTime)}</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {point.value.toFixed(0)}°
                </p>
                <p className="mt-0.5 text-[0.6rem] text-cyan-ink">
                  {rainByStep.get(point.validTime) !== undefined
                    ? `${(rainByStep.get(point.validTime) ?? 0).toFixed(1)} mm`
                    : '—'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 border-t border-hairline pt-4 text-[0.65rem] leading-relaxed text-haze">
        Data: ECMWF Open Data, © European Centre for Medium-Range Weather Forecasts, retrieved from
        AWS Open Data, licensed under{' '}
        <a
          className="underline decoration-dotted underline-offset-2 hover:text-foreground"
          href="https://creativecommons.org/licenses/by/4.0/"
          rel="noreferrer noopener"
          target="_blank"
        >
          CC BY 4.0
        </a>
        . Values interpolated to city coordinates and converted to °C / km/h / mm. Provided as-is
        with no warranty; no implied endorsement by ECMWF.
      </p>
    </>
  )
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-veil px-3 py-3">
      <div className="flex items-center gap-1.5 text-haze">
        {icon}
        <span className="text-[0.62rem] uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-lg font-semibold text-foreground">{value}</p>
      {detail ? <p className="mt-0.5 text-[0.65rem] text-haze">{detail}</p> : null}
    </div>
  )
}

export { ClimateForecastCard }
