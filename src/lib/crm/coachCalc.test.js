import test from 'node:test'
import assert from 'node:assert/strict'
import { lastMonth, reviewDue, facts } from './coachCalc.js'

test('last month is the whole previous month, also over a year change', () => {
    const a = lastMonth(Date.UTC(2026, 10, 3, 12), 'UTC')
    assert.equal(a.key, '2026-10'); assert.equal(a.from.toISOString(), '2026-10-01T00:00:00.000Z'); assert.equal(a.to.toISOString(), '2026-11-01T00:00:00.000Z'); assert.equal(a.label, 'October 2026')
    const b = lastMonth(Date.UTC(2027, 0, 8, 9), 'UTC')
    assert.equal(b.key, '2026-12'); assert.equal(b.to.toISOString(), '2027-01-01T00:00:00.000Z')
})

test('the review is due from the 8th at 08:00 and only once a month', () => {
    const t = (d, h) => Date.UTC(2026, 10, d, h)
    assert.equal(reviewDue({ now: t(7, 23), last: '' }), false)
    assert.equal(reviewDue({ now: t(8, 7), last: '' }), false)
    assert.equal(reviewDue({ now: t(8, 8), last: '' }), true)
    assert.equal(reviewDue({ now: t(20, 10), last: '' }), true)
    assert.equal(reviewDue({ now: t(20, 10), last: '2026-11' }), false)
})

const range = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-11-01T00:00:00Z') }
const task = (o) => ({ id: o.id, name: o.id, status: 4, dueDate: null, dateFinished: null, createdAt: '2026-10-05T10:00:00Z', addedFrom: 'a', description: 'x', assigneeIds: ['a'], followerIds: [], commentStaffIds: [], ...o })

test('a task made, done and closed by the same person with nobody watching counts as self-validated', () => {
    const tasks = [
        task({ id: 't1', status: 5, dateFinished: '2026-10-07T10:00:00Z' }),
        task({ id: 't2', status: 5, dateFinished: '2026-10-08T10:00:00Z', followerIds: ['boss'] }),
        task({ id: 't3', status: 5, dateFinished: '2026-10-09T10:00:00Z', commentStaffIds: ['boss'] }),
        task({ id: 't4', description: '', dueDate: null }),
    ]
    const f = facts({ staffId: 'a', range, tasks, supervisors: ['boss'] })
    assert.equal(f.tasksCompleted, 3); assert.equal(f.createdAndClosedByThemselvesWithNobodyElse, 1)
    assert.deepEqual(f.selfValidatedExamples, ['t1']); assert.equal(f.createdWithoutDescription, 1); assert.equal(f.tasksWithoutASupervisor, 3)
})

test('a supervisor sees how much of the team work was followed', () => {
    const tasks = [task({ id: 't1', followerIds: ['boss'] }), task({ id: 't2' }), task({ id: 't3', status: 5, dateFinished: '2026-10-09T10:00:00Z' })]
    const f = facts({ staffId: 'boss', range, tasks, supervisors: ['boss'] })
    assert.equal(f.supervision.teamTasksCreatedInMonth, 3); assert.equal(f.supervision.followedByYou, 1); assert.equal(f.supervision.notFollowedByYou, 2)
    assert.equal(f.supervision.closedByTheCreatorAloneByPersonId.a, 1)
})

test('hours come from the timers of the month, a running timer is capped', () => {
    const f = facts({ staffId: 'a', range, tasks: [], timers: [{ staffId: 'a', startTime: '2026-10-02T08:00:00Z', endTime: '2026-10-02T10:30:00Z' }, { staffId: 'a', startTime: '2026-10-03T08:00:00Z', endTime: null }, { staffId: 'b', startTime: '2026-10-02T08:00:00Z', endTime: '2026-10-02T09:00:00Z' }] })
    assert.equal(f.hoursTracked, 12.5)
})
