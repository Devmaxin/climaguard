/**
 * Pure snapshot selection shared by the browser and its tests.
 *
 * Both the client and the Edge Function must choose the same model run. The
 * browser query is ordered by the timestamp text, so a malformed value can
 * arrive first; choosing the newest *parseable* reference avoids that.
 */

export type ReferenceRow = { forecast_reference_time: string }

export function selectNewestRun<T extends ReferenceRow>(
  rows: T[],
): { referenceTime: string; rows: T[] } | null {
  if (rows.length === 0) return null

  let referenceTime = rows[0].forecast_reference_time
  let newest = Date.parse(referenceTime)

  for (const row of rows) {
    const parsed = Date.parse(row.forecast_reference_time)
    if (!Number.isFinite(parsed)) continue
    if (Number.isFinite(newest) && parsed <= newest) continue
    referenceTime = row.forecast_reference_time
    newest = parsed
  }

  return {
    referenceTime,
    rows: rows.filter((row) => row.forecast_reference_time === referenceTime),
  }
}

export function closestValidPoint<T extends { variable: string; validTime: string }>(
  points: T[],
  variable: string,
  target: number,
): T | null {
  if (!Number.isFinite(target)) return null

  let best: T | null = null
  let bestDistance = Infinity

  for (const point of points) {
    if (point.variable !== variable) continue

    const time = Date.parse(point.validTime)
    if (!Number.isFinite(time)) continue

    const distance = Math.abs(time - target)
    if (distance < bestDistance) {
      best = point
      bestDistance = distance
    }
  }

  return best
}
