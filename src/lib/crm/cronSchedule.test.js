import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSchedule, crontabExpr, intervalMs, isDue, nextRun } from './cronSchedule.js'

test('schedule: junk becomes every 15 minutes, numbers are kept inside what each unit allows', () => {
    assert.deepEqual(normalizeSchedule({}), { unit: 'minute', every: 15, atHour: 9 })
    assert.deepEqual(normalizeSchedule({ every: '5', unit: 'minute' }), { unit: 'minute', every: 5, atHour: 9 })
    assert.equal(normalizeSchedule({ every: 500, unit: 'minute' }).every, 59)
    assert.equal(normalizeSchedule({ every: 0, unit: 'hour' }).every, 1)
    assert.equal(normalizeSchedule({ every: 99, unit: 'day', atHour: 30 }).atHour, 23)
    assert.equal(normalizeSchedule({ every: 3, unit: 'weeks' }).unit, 'minute')
})
test('schedule: the crontab line for minutes, hours and days', () => {
    assert.equal(crontabExpr({ every: 1, unit: 'minute' }), '* * * * *')
    assert.equal(crontabExpr({ every: 5, unit: 'minute' }), '*/5 * * * *')
    assert.equal(crontabExpr({ every: 1, unit: 'hour' }), '0 * * * *')
    assert.equal(crontabExpr({ every: 6, unit: 'hour' }), '0 */6 * * *')
    assert.equal(crontabExpr({ every: 1, unit: 'day', atHour: 9 }), '0 9 * * *')
    assert.equal(crontabExpr({ every: 2, unit: 'day', atHour: 3 }), '0 3 */2 * *')
})
test('schedule: due when the interval has passed; a day schedule also waits for its hour', () => {
    const now = Date.UTC(2026, 9, 18, 9, 0, 0)
    const m5 = { every: 5, unit: 'minute' }
    assert.equal(intervalMs(m5), 300000)
    assert.equal(isDue(m5, { lastRunMs: now - 4 * 60000, nowMs: now }), false)
    assert.equal(isDue(m5, { lastRunMs: now - 5 * 60000, nowMs: now }), true)
    assert.equal(isDue(m5, { lastRunMs: 0, nowMs: now }), true)
    const d = { every: 1, unit: 'day', atHour: 9 }
    assert.equal(isDue(d, { lastRunMs: now - 25 * 3600000, nowMs: now, hour: 8 }), false)
    assert.equal(isDue(d, { lastRunMs: now - 25 * 3600000, nowMs: now, hour: 9 }), true)
    assert.equal(isDue(d, { lastRunMs: now - 3 * 3600000, nowMs: now, hour: 12 }), false)
    assert.equal(isDue(d, { lastRunMs: 0, nowMs: now, hour: 7 }), false)
})
test('schedule: the next run is one interval after the last, never in the past', () => {
    const now = Date.UTC(2026, 9, 18, 9, 0, 0)
    assert.equal(nextRun({ every: 10, unit: 'minute' }, { lastRunMs: now - 3 * 60000, nowMs: now }).getTime(), now + 7 * 60000)
    assert.equal(nextRun({ every: 10, unit: 'minute' }, { lastRunMs: now - 60 * 60000, nowMs: now }).getTime(), now)
})
