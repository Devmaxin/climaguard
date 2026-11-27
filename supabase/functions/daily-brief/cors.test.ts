import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { corsHeaders, resolveOrigin } from './cors.ts'

const APP = 'https://climaguard.example'

describe('origin resolution', () => {
  it('grants the configured origin to an exact match', () => {
    assert.equal(resolveOrigin(APP, APP), APP)
    assert.equal(corsHeaders(resolveOrigin(APP, APP))['access-control-allow-origin'], APP)
  })

  it('grants nothing to a different origin', () => {
    assert.equal(resolveOrigin(APP, 'https://attacker.example'), null)
    assert.equal(
      corsHeaders(resolveOrigin(APP, 'https://attacker.example'))['access-control-allow-origin'],
      undefined,
    )
  })

  it('grants nothing to a lookalike or partial origin', () => {
    assert.equal(resolveOrigin(APP, `${APP}.attacker.example`), null)
    assert.equal(resolveOrigin(APP, 'https://climaguard.example:8443'), null)
    assert.equal(resolveOrigin(APP, 'http://climaguard.example'), null)
    assert.equal(resolveOrigin(APP, 'https://sub.climaguard.example'), null)
  })

  it('grants nothing when the request sends no origin', () => {
    assert.equal(resolveOrigin(APP, null), null)
    assert.equal(resolveOrigin(APP, ''), null)
  })

  it('never reflects an arbitrary origin back', () => {
    for (const origin of ['null', 'file://', 'https://evil.example', 'CAPITAL.example']) {
      assert.equal(resolveOrigin(APP, origin), null)
    }
  })

  it('tolerates surrounding whitespace on both sides of the comparison', () => {
    assert.equal(resolveOrigin(` ${APP} `, ` ${APP}`), APP)
  })

  it('falls back to a wildcard only when no origin is configured', () => {
    assert.equal(resolveOrigin(undefined, APP), '*')
    assert.equal(resolveOrigin('', APP), '*')
    assert.equal(resolveOrigin('   ', null), '*')
  })
})

describe('cors headers', () => {
  it('omits the origin grant entirely when the origin is not allowed', () => {
    const headers = corsHeaders(null)

    assert.equal('access-control-allow-origin' in headers, false)
    assert.equal(headers['access-control-allow-methods'], 'POST, OPTIONS')
    assert.equal(headers.vary, 'Origin')
  })

  it('advertises the methods and headers the function actually accepts', () => {
    const headers = corsHeaders(APP)

    assert.equal(headers['access-control-allow-methods'], 'POST, OPTIONS')
    assert.match(headers['access-control-allow-headers'], /authorization/)
    assert.match(headers['access-control-allow-headers'], /content-type/)
  })
})
