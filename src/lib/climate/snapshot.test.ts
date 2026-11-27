import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { closestValidPoint, selectNewestRun } from './snapshot.ts'

const NEWEST = '2026-11-25T00:00:00.000Z'
const OLDER = '2026-11-24T12:00:00.000Z'

function row(reference: string, value: number) {
  return { forecast_reference_time: reference, value }
}

describe('selectNewestRun', () => {
  it('returns null when nothing was ingested', () => {
    assert.equal(selectNewestRun([]), null)
  })

  it('ignores a malformed reference that sorts first', () => {
    const selected = selectNewestRun([row('not-a-timestamp', 30), row(NEWEST, 20)])

    assert.equal(selected?.referenceTime, NEWEST)
    assert.deepEqual(selected?.rows, [row(NEWEST, 20)])
  })

  it('keeps only the newest model run', () => {
    const selected = selectNewestRun([row(OLDER, 30), row(NEWEST, 20)])

    assert.equal(selected?.referenceTime, NEWEST)
    assert.deepEqual(selected?.rows, [row(NEWEST, 20)])
  })

  it('falls back to the first value when no reference parses', () => {
    const selected = selectNewestRun([row('bad-one', 1), row('bad-two', 2)])

    assert.equal(selected?.referenceTime, 'bad-one')
    assert.deepEqual(selected?.rows, [row('bad-one', 1)])
  })
})

describe('closestValidPoint', () => {
  const points = [
    { variable: 'temperature_2m', validTime: 'not-a-timestamp', value: 99 },
    { variable: 'temperature_2m', validTime: '2026-11-25T09:00:00.000Z', value: 20 },
    { variable: 'temperature_2m', validTime: '2026-11-25T12:00:00.000Z', value: 22 },
    { variable: 'wind_speed', validTime: '2026-11-25T09:00:00.000Z', value: 12 },
  ]

  it('ignores malformed valid times', () => {
    const point = closestValidPoint(points, 'temperature_2m', Date.parse('2026-11-25T11:00:00.000Z'))

    assert.equal(point?.value, 22)
  })

  it('returns null for an invalid target or no matching variable', () => {
    assert.equal(closestValidPoint(points, 'temperature_2m', Number.NaN), null)
    assert.equal(closestValidPoint(points, 'pressure_msl', Date.now()), null)
  })
})
