import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDay, cleanPeriod, blocksFor, startOfDayUtc, todayIn } from './closedDays.js'

const TZ = 'Africa/Casablanca' // UTC+1 all year
const at = (s) => Date.parse(s)

test('a day is a real calendar date', () => {
    assert.ok(parseDay('2026-02-28'))
    assert.equal(parseDay('2026-02-30'), null)
    assert.equal(parseDay('28/02/2026'), null)
})
test('a closed period: valid, ordered, at most a year', () => {
    assert.deepEqual(cleanPeriod('2026-12-24', '2026-12-26'), { fromDay: '2026-12-24', toDay: '2026-12-26' })
    assert.deepEqual(cleanPeriod('2026-12-24'), { fromDay: '2026-12-24', toDay: '2026-12-24' })
    assert.match(cleanPeriod('2026-12-26', '2026-12-24').error, /cannot be before/)
    assert.match(cleanPeriod('2026-01-01', '2028-01-01').error, /a year at most/)
    assert.match(cleanPeriod('x', 'y').error, /real dates/)
})
test('the start of a day follows the time zone', () => {
    assert.equal(startOfDayUtc(2026, 11, 10, 'UTC'), at('2026-11-10T00:00:00Z'))
    assert.equal(startOfDayUtc(2026, 11, 10, TZ), at('2026-11-09T23:00:00Z'))
    assert.equal(todayIn(TZ, at('2026-11-10T23:30:00Z')), '2026-11-11')
})
test('a closed period blocks its whole days, from the first midnight to the next one after the last day', () => {
    const b = blocksFor({ closed: [{ fromDay: '2026-12-24', toDay: '2026-12-25', label: 'Holidays' }], tz: TZ, from: at('2026-12-01T00:00:00Z'), to: at('2027-01-01T00:00:00Z'), now: at('2026-11-01T10:00:00Z') })
    assert.equal(b.length, 1)
    assert.equal(b[0].start, at('2026-12-23T23:00:00Z'))
    assert.equal(b[0].end, at('2026-12-25T23:00:00Z'))
    assert.equal(b[0].status, 'closed'); assert.equal(b[0].label, 'Holidays')
})
test('a minimum notice of 2 days closes today and tomorrow', () => {
    const now = at('2026-11-10T10:00:00Z') // Tuesday 11:00 in Casablanca
    const b = blocksFor({ minNoticeDays: 2, tz: TZ, from: now - 86400000, to: now + 10 * 86400000, now })
    assert.equal(b.length, 1)
    assert.equal(b[0].start, now)
    assert.equal(b[0].end, at('2026-11-11T23:00:00Z')) // Friday-style: the day after tomorrow starts at 00:00 local = 23:00 UTC the evening before
    assert.equal(b[0].status, 'notice')
    assert.deepEqual(blocksFor({ minNoticeDays: 0, tz: TZ, from: now, to: now + 86400000, now }), [])
})
test('blocks are cut to the asked range and ignore bad rows', () => {
    const b = blocksFor({ closed: [{ fromDay: '2026-12-24', toDay: '2026-12-25' }, { fromDay: 'bad' }, { fromDay: '2026-12-30', toDay: '2026-12-29' }], tz: 'UTC', from: at('2026-12-25T00:00:00Z'), to: at('2026-12-25T12:00:00Z'), now: at('2026-11-01T00:00:00Z') })
    assert.equal(b.length, 1)
    assert.equal(b[0].start, at('2026-12-25T00:00:00Z'))
    assert.equal(b[0].end, at('2026-12-25T12:00:00Z'))
})
