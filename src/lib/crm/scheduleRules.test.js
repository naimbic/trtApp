import test from 'node:test'
import assert from 'node:assert/strict'
import { step, nextAfter, describe } from './scheduleRules.js'

const d = (s) => new Date(s)
test('daily and weekly steps', () => {
    assert.equal(step(d('2026-11-02T09:00:00Z'), 'daily').toISOString(), '2026-11-03T09:00:00.000Z')
    assert.equal(step(d('2026-11-02T09:00:00Z'), 'weekly').toISOString(), '2026-11-09T09:00:00.000Z')
})
test('weekdays skip the weekend', () => {
    assert.equal(step(d('2026-11-06T09:00:00Z'), 'weekdays').toISOString(), '2026-11-09T09:00:00.000Z') // Friday -> Monday
    assert.equal(step(d('2026-11-02T09:00:00Z'), 'weekdays').toISOString(), '2026-11-03T09:00:00.000Z')
})
test('monthly keeps the day or the last day of a short month', () => {
    assert.equal(step(d('2026-01-31T08:30:00Z'), 'monthly').toISOString(), '2026-02-28T08:30:00.000Z')
    assert.equal(step(d('2026-03-15T08:30:00Z'), 'monthly').toISOString(), '2026-04-15T08:30:00.000Z')
    assert.equal(step(d('2026-12-10T08:30:00Z'), 'monthly').toISOString(), '2027-01-10T08:30:00.000Z')
})
test('nextAfter skips what was missed and never repeats for none', () => {
    assert.equal(nextAfter(d('2026-11-02T09:00:00Z'), 'daily', d('2026-11-10T12:00:00Z')).toISOString(), '2026-11-11T09:00:00.000Z')
    assert.equal(nextAfter(d('2026-11-02T09:00:00Z'), 'none', d('2026-11-10T12:00:00Z')), null)
    assert.equal(nextAfter(d('2026-11-02T09:00:00Z'), 'weekly', d('2026-11-02T09:00:01Z')).toISOString(), '2026-11-09T09:00:00.000Z')
})

test('custom: every N days, weeks, months or years', () => {
    assert.equal(step(d('2026-11-02T09:00:00Z'), 'custom', { every: 3, unit: 'day' }).toISOString(), '2026-11-05T09:00:00.000Z')
    assert.equal(step(d('2026-11-02T09:00:00Z'), 'custom', { every: 2, unit: 'week' }).toISOString(), '2026-11-16T09:00:00.000Z')
    assert.equal(step(d('2026-01-31T09:00:00Z'), 'custom', { every: 1, unit: 'month' }).toISOString(), '2026-02-28T09:00:00.000Z')
    assert.equal(step(d('2026-03-15T09:00:00Z'), 'custom', { every: 2, unit: 'year' }).toISOString(), '2028-03-15T09:00:00.000Z')
    assert.equal(step(d('2026-11-02T09:00:00Z'), 'custom', { every: 0, unit: 'nonsense' }).toISOString(), '2026-11-03T09:00:00.000Z')
})
test('custom: skips what was missed and describes itself', () => {
    assert.equal(nextAfter(d('2026-11-02T09:00:00Z'), 'custom', d('2026-11-10T00:00:00Z'), { every: 3, unit: 'day' }).toISOString(), '2026-11-11T09:00:00.000Z')
    assert.equal(describe('custom', { every: 2, unit: 'week' }, 5), 'Every 2 weeks, 5 times')
    assert.equal(describe('daily', {}, 2), 'Every day, 2 times')
    assert.equal(describe('none', {}, 3), 'Once')
})
