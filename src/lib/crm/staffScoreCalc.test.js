import test from 'node:test'
import assert from 'node:assert/strict'
import { combineScore, workdays } from './staffScoreCalc.js'

test('the score is the average of the parts that can be measured', () => {
    assert.equal(combineScore({ completion: 80, onTime: 100, hours: 60 }), 80)
    assert.equal(combineScore({ completion: 80, onTime: null, hours: null }), 80)
    assert.equal(combineScore({ completion: null, onTime: null, hours: null }), null)
})

test('working days skip weekends', () => {
    assert.equal(workdays('2026-10-19', '2026-10-25'), 5) // Mon-Sun
    assert.equal(workdays('2026-10-24', '2026-10-25'), 0)
})
