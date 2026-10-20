import test from 'node:test'
import assert from 'node:assert/strict'
import { periodRange, goalStanding, suggestName, kindOf, GOAL_KINDS, parseSteps, cleanSteps, stepsState, defaultSteps } from './goalsCalc.js'

test('a monthly goal always covers the current month, a quarterly one the current quarter', () => {
    const now = new Date(2026, 9, 20) // 20 October 2026
    const m = periodRange('month', now)
    assert.equal(m.start.getMonth(), 9); assert.equal(m.end.getDate(), 31)
    const q = periodRange('quarter', now)
    assert.equal(q.start.getMonth(), 9); assert.equal(q.end.getMonth(), 11); assert.equal(q.end.getDate(), 31)
    const y = periodRange('year', now)
    assert.equal(y.start.getMonth(), 0); assert.equal(y.end.getMonth(), 11)
    const f = periodRange('fixed', now, '2026-03-01', '2026-03-31')
    assert.equal(f.start.getMonth(), 2); assert.equal(f.end.getDate(), 31)
})

test('standing: achieved, missed, upcoming and the pace of a running goal', () => {
    const start = new Date(2026, 9, 1), end = new Date(2026, 9, 31, 23, 59, 59)
    const at = (d, current) => goalStanding({ current, target: 100, start, end, now: new Date(2026, 9, d) })
    assert.equal(at(10, 100).status, 'achieved')
    assert.equal(at(10, 60).status, 'ahead') // a third of the month gone, 60% done
    assert.equal(at(16, 50).status, 'on_track') // about half gone, half done
    assert.equal(at(25, 20).status, 'behind')
    assert.equal(goalStanding({ current: 10, target: 100, start, end, now: new Date(2026, 10, 3) }).status, 'missed')
    assert.equal(goalStanding({ current: 0, target: 100, start, end, now: new Date(2026, 8, 20) }).status, 'upcoming')
    const s = at(21, 40)
    assert.equal(s.remaining, 60); assert.ok(s.perDay > 5 && s.perDay < 7)
})

test('names and kinds', () => {
    assert.equal(suggestName('income', 'month', 100000), 'Income collected 100000 every month')
    assert.ok(kindOf('tasks')); assert.equal(kindOf('nope'), null)
    assert.ok(GOAL_KINDS.every((k) => ['money', 'count'].includes(k.unit)))
})

test('steps: milestones follow the value, action steps are ticked', () => {
    const steps = parseSteps(JSON.stringify([{ title: ' Half way ', at: 50 }, { title: 'Call the 20 best clients', done: true }, { title: 'Send offers' }, { title: '' }]))
    assert.equal(steps.length, 3)
    const st = stepsState(steps, 60)
    assert.equal(st[0].reached, true); assert.equal(st[0].auto, true)
    assert.equal(st[1].reached, true); assert.equal(st[1].auto, false)
    assert.equal(st[2].reached, false)
    assert.equal(stepsState(steps, 10)[0].reached, false)
})

test('steps are checked before they are stored', () => {
    assert.equal(cleanSteps(null), null)
    assert.equal(cleanSteps([]), null)
    assert.equal(JSON.parse(cleanSteps([{ title: 'A', at: '25' }]))[0].at, 25)
    assert.throws(() => cleanSteps(Array.from({ length: 31 }, (_, i) => ({ title: `s${i}` }))), /30 steps/)
    assert.deepEqual(defaultSteps(1000).map((s) => s.at), [250, 500, 750, 1000])
})
