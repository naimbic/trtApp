import test from 'node:test'
import assert from 'node:assert/strict'
import { localParts, dayKeys, expectedHours, pingSeconds, summarize, DEFAULT_SCHEDULE, toMinutes, fmtMinutes } from './workHoursCalc.js'

test('local parts follow the company time zone', () => {
    const p = localParts('2026-10-19T07:30:00Z', 'Africa/Casablanca') // Monday, UTC+1 in autumn 2026
    assert.equal(p.key, '2026-10-19')
    assert.equal(p.dow, 1)
    assert.ok(p.minutes === 8 * 60 + 30 || p.minutes === 7 * 60 + 30)
    assert.equal(localParts('2026-10-19T23:30:00Z', 'Asia/Tokyo').key, '2026-10-20')
})

test('the working week: 8 hours Monday to Friday, 4 on Saturday, none on Sunday', () => {
    assert.equal(expectedHours('2026-10-19', DEFAULT_SCHEDULE), 8)
    assert.equal(expectedHours('2026-10-24', DEFAULT_SCHEDULE), 4)
    assert.equal(expectedHours('2026-10-25', DEFAULT_SCHEDULE), 0)
    assert.equal(dayKeys('2026-10-19', '2026-10-25').length, 7)
})

test('a heartbeat adds the gap, or one interval after a long absence', () => {
    assert.equal(pingSeconds(60000), 60)
    assert.equal(pingSeconds(3600000), 60)
})

test('summary: hours, overtime, late days and averages', () => {
    const days = [
        { day: '2026-10-19', firstSeen: '2026-10-19T09:00:00Z', lastSeen: '2026-10-19T19:00:00Z', activeSeconds: 10 * 3600 }, // 10h on an 8h day
        { day: '2026-10-20', firstSeen: '2026-10-20T10:00:00Z', lastSeen: '2026-10-20T16:00:00Z', activeSeconds: 5 * 3600 }, // late, short
        { day: '2026-10-25', firstSeen: '2026-10-25T09:00:00Z', lastSeen: '2026-10-25T10:00:00Z', activeSeconds: 3600 }, // a Sunday
    ]
    const s = summarize(days, DEFAULT_SCHEDULE, '2026-10-19', '2026-10-25', 'UTC')
    assert.equal(s.totals.active, 16)
    assert.equal(s.totals.expected, 8 * 5 + 4)
    assert.equal(s.totals.overtime, 3) // 2h on Monday + 1h on Sunday
    assert.equal(s.totals.worked, 3)
    assert.equal(s.totals.late, 1)
    assert.equal(toMinutes('09:30'), 570)
    assert.equal(fmtMinutes(570), '09:30')
})

test('summarize adds the time the mouse or keyboard really moved, and its share of the active time', async () => {
    const { summarize, DEFAULT_SCHEDULE } = await import('./workHoursCalc.js')
    const d = { day: '2026-10-19', firstSeen: new Date('2026-10-19T09:00:00Z'), lastSeen: new Date('2026-10-19T17:00:00Z'), activeSeconds: 8 * 3600, inputSeconds: 4 * 3600 }
    const s = summarize([d], DEFAULT_SCHEDULE, '2026-10-19', '2026-10-19', 'UTC', '2026-10-19')
    assert.equal(s.rows[0].input, 4)
    assert.equal(s.totals.input, 4)
    assert.equal(s.totals.moving, 50)
})
