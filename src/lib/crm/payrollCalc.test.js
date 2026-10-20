import test from 'node:test'
import assert from 'node:assert/strict'
import { lastMonths, monthsOfYear, dueFor, monthStatus, toBase, dueMonthOf, lateBefore } from './payrollCalc.js'

test('months', () => {
    assert.deepEqual(lastMonths(3, new Date(2026, 0, 15)), ['2025-11', '2025-12', '2026-01'])
    assert.equal(monthsOfYear(2026).length, 12)
})

test('what is due follows the salary and its start month', () => {
    assert.equal(dueFor('2026-03', 5000, '2026-04'), 0)
    assert.equal(dueFor('2026-04', 5000, '2026-04'), 5000)
    assert.equal(dueFor('2026-04', 5000, null), 5000)
    assert.equal(dueFor('2026-04', 0, null), 0)
    assert.equal(dueFor('2026-07', 5000, '2026-04', '2026-06'), 0) // after the fire month
    assert.equal(dueFor('2026-06', 5000, '2026-04', '2026-06'), 5000)
})

test('month status', () => {
    assert.equal(monthStatus(0, 0, '2026-01', '2026-10'), 'none')
    assert.equal(monthStatus(5000, 5000, '2026-01', '2026-10'), 'paid')
    assert.equal(monthStatus(5000, 2000, '2026-01', '2026-10'), 'partial')
    assert.equal(monthStatus(5000, 0, '2026-01', '2026-10'), 'late')
    assert.equal(monthStatus(5000, 0, '2026-10', '2026-10'), 'due')
})

test('amounts in the base currency', () => {
    assert.equal(toBase(100, 10), 1000)
    assert.equal(toBase(100, null), 100)
})

test('paid in arrears: October shows from the 1st of November', () => {
    assert.equal(dueMonthOf(new Date(2026, 9, 20), true), '2026-09') // 20 October: September is the one to pay
    assert.equal(dueMonthOf(new Date(2026, 10, 1), true), '2026-10') // 1 November: October becomes due
    assert.equal(dueMonthOf(new Date(2026, 0, 5), true), '2025-12')
    assert.equal(dueMonthOf(new Date(2026, 9, 20), false), '2026-10')
})

test('the due month is late only after the pay day', () => {
    assert.equal(monthStatus(5000, 0, '2026-09', lateBefore(new Date(2026, 9, 8), true, 10)), 'due') // 8 October, pay day 10
    assert.equal(monthStatus(5000, 0, '2026-09', lateBefore(new Date(2026, 9, 12), true, 10)), 'late') // 12 October
    assert.equal(monthStatus(5000, 0, '2026-10', lateBefore(new Date(2026, 9, 12), false, 10)), 'due') // not in arrears
})
