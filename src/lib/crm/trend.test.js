import test from 'node:test'
import assert from 'node:assert/strict'
import { inWindows, trendOf } from './trend.js'

const D = 86400000
const now = Date.UTC(2026, 9, 18)
const rows = [{ d: now - 1 * D, v: 10 }, { d: now - 30 * D, v: 4 }, { d: now - 31 * D, v: 5 }, { d: now - 60 * D, v: 6 }, { d: now - 61 * D, v: 99 }, { d: now + 3 * D, v: 77 }, { d: null, v: 55 }]

test('trend: the last 30 days against the 30 days before, each day in one window only, the future and undated ignored', () => {
    const w = inWindows(rows, (r) => r.d, now)
    assert.deepEqual(w.cur.map((r) => r.v), [10])
    assert.deepEqual(w.prev.map((r) => r.v), [4, 5])
})
test('trend: each window is counted with the rule the figure itself uses', () => {
    const t = trendOf(rows, (r) => r.d, (l) => ({ n: l.length, sum: l.reduce((a, r) => a + r.v, 0) }), now)
    assert.deepEqual(t, { days: 30, cur: { n: 1, sum: 10 }, prev: { n: 2, sum: 9 } })
})
