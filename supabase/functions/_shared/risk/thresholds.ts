/**
 * Configurable thresholds for the deterministic risk engine.
 *
 * THRESHOLD POLICY
 *   A severity tier may only exist here when a published standard defines it.
 *   Anything without such a standard is reported as evidence and left
 *   unclassified — the engine never invents a band.
 *
 *   * Wind — the WMO Beaufort scale is a published standard for sustained
 *     10 m mean wind, which is exactly what `wind_speed` holds. Tiers start at
 *     Beaufort 6 because below that the value describes ordinary weather.
 *   * Heat — no tier. Heat stress needs a heat index or UTCI, which require
 *     humidity, solar radiation and mean radiant temperature. None are
 *     ingested, and a heat *wave* additionally needs a climatological normal
 *     that we do not store.
 *   * Flood — no tier. Rainfall totals alone do not determine flooding; that
 *     needs catchment, drainage, antecedent soil moisture and tide context.
 *   * Air quality, drought, coastal — no tier and no data source.
 *
 *   The Beaufort boundaries are in km/h, the unit `wind_speed` is stored in.
 */

export type WindTier = {
  id: string
  /** Beaufort number this tier starts at. */
  beaufort: number
  /** Inclusive lower bound of the tier, in km/h. */
  minKmh: number
  label: string
}

export type RiskThresholds = {
  /** Hours between consecutive forecast steps in the stored data. */
  stepHours: number
  /** Length of the forward window every evidence figure is computed over. */
  windowHours: number
  /**
   * A forecast older than this is treated as stale and no classification is
   * emitted. Mirrors STALE_AFTER_HOURS in `@/lib/climate/climate-api`; it is
   * restated here so this module stays free of application imports.
   */
  staleAfterHours: number
  wind: {
    source: string
    /** Lowest Beaufort number reported as a notable tier. */
    notableFromBeaufort: number
    tiers: WindTier[]
  }
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  stepHours: 3,
  windowHours: 24,
  staleAfterHours: 12,
  wind: {
    source: 'WMO Beaufort wind scale (10 m sustained wind)',
    notableFromBeaufort: 6,
    tiers: [
      { id: 'wind_beaufort_6', beaufort: 6, minKmh: 39, label: 'Strong breeze (Beaufort 6)' },
      { id: 'wind_beaufort_7', beaufort: 7, minKmh: 50, label: 'Near gale (Beaufort 7)' },
      { id: 'wind_beaufort_8', beaufort: 8, minKmh: 62, label: 'Gale (Beaufort 8)' },
      { id: 'wind_beaufort_9', beaufort: 9, minKmh: 75, label: 'Severe gale (Beaufort 9)' },
      { id: 'wind_beaufort_10', beaufort: 10, minKmh: 89, label: 'Storm (Beaufort 10)' },
      { id: 'wind_beaufort_11', beaufort: 11, minKmh: 103, label: 'Violent storm (Beaufort 11)' },
      { id: 'wind_beaufort_12', beaufort: 12, minKmh: 118, label: 'Hurricane force (Beaufort 12)' },
    ],
  },
}

/** The highest configured tier whose lower bound the observation reaches. */
export function windTierFor(maxKmh: number, thresholds: RiskThresholds): WindTier | null {
  let match: WindTier | null = null

  for (const tier of thresholds.wind.tiers) {
    if (maxKmh >= tier.minKmh) match = tier
  }

  return match
}
