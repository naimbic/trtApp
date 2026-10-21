import test from 'node:test'
import assert from 'node:assert/strict'
import { milestoneState, percent, daysLeft } from './milestonesCalc.js'

const now = new Date('2026-10-21T10:00:00')
test('a milestone is done when every task is complete', () => {
    assert.equal(milestoneState({ dueDate: '2026-10-01', tasks: { total: 3, done: 3 } }, now), 'done')
    assert.equal(milestoneState({ dueDate: null, tasks: { total: 0, done: 0 } }, now), 'empty')
})
test('overdue, soon and open follow the due date', () => {
    assert.equal(milestoneState({ dueDate: '2026-10-20', tasks: { total: 3, done: 1 } }, now), 'overdue')
    assert.equal(milestoneState({ dueDate: '2026-10-21', tasks: { total: 3, done: 1 } }, now), 'soon')
    assert.equal(milestoneState({ dueDate: '2026-10-28', tasks: { total: 3, done: 1 } }, now), 'soon')
    assert.equal(milestoneState({ dueDate: '2026-11-15', tasks: { total: 3, done: 1 } }, now), 'open')
    assert.equal(milestoneState({ dueDate: '2026-11-15', tasks: { total: 0, done: 0 } }, now), 'open')
})
test('percent and days left', () => {
    assert.equal(percent({ total: 4, done: 1 }), 25)
    assert.equal(percent({ total: 0, done: 0 }), 0)
    assert.equal(daysLeft('2026-10-18', now), -3)
    assert.equal(daysLeft(null, now), null)
})
