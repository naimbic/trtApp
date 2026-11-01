import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, goalPoints, TROPHIES, LEVELS } from './growthRewards.js'

const NOW = new Date('2026-11-01T10:00:00Z')
const pass = (o = {}) => ({ status: 'passed', kind: 'certification', catalogKey: null, doneDate: '2026-10-01', files: 0, ...o })

test('rewards: nobody starts with points, prizes are between 200 and 1000 MAD', () => {
    const e = evaluate([], NOW)
    assert.equal(e.points, 0); assert.equal(e.level.key, 'rookie'); assert.equal(e.next.key, 'learner')
    for (const t of TROPHIES) assert.ok(t.prize === 0 || (t.prize >= 200 && t.prize <= 1000), t.key)
    assert.equal(Math.max(...TROPHIES.map((t) => t.prize)), 1000)
})
test('rewards: a goal is worth its kind and level; AI adds 50', () => {
    assert.equal(goalPoints({ status: 'planned' }), 10)
    assert.equal(goalPoints({ status: 'learning' }), 20)
    assert.equal(goalPoints({ status: 'passed', kind: 'language' }), 200)
    assert.equal(goalPoints({ status: 'passed', kind: 'certification', catalogKey: 'google-ads-search' }), 200)
    assert.equal(goalPoints({ status: 'passed', kind: 'certification', catalogKey: 'aws-certified-ai-practitioner' }), 150)
})
test('rewards: the first certificate wins its trophy and the 50 point bonus', () => {
    const e = evaluate([pass()], NOW)
    assert.ok(e.trophies.find((t) => t.key === 'first-pass').earned)
    assert.ok(e.trophies.find((t) => t.key === 'first-step').earned)
    assert.equal(e.points, 150 + 2 * 50) // 150 for a goal without a catalog level, two trophies
})
test('rewards: hat-trick needs three passed goals within 12 months; an old one does not count', () => {
    const three = evaluate([pass(), pass(), pass()], NOW)
    assert.ok(three.trophies.find((t) => t.key === 'hat-trick').earned)
    const old = evaluate([pass(), pass(), pass({ doneDate: '2024-01-01' })], NOW)
    assert.ok(!old.trophies.find((t) => t.key === 'hat-trick').earned)
    assert.equal(old.trophies.find((t) => t.key === 'hat-trick').progress, 2)
})
test('rewards: language, AI and proof trophies; open goals earn a few points, five at most', () => {
    const e = evaluate([pass({ kind: 'language' }), pass({ catalogKey: 'deeplearning-ai-short-courses', files: 1 })], NOW)
    for (const k of ['polyglot', 'ai-ready', 'proof-kept']) assert.ok(e.trophies.find((t) => t.key === k).earned, k)
    const many = evaluate(Array.from({ length: 9 }, () => ({ status: 'learning', kind: 'skill' })), NOW)
    assert.equal(many.base, 100)
})
test('rewards: levels follow the points', () => {
    assert.equal(LEVELS.length, 5)
    const big = evaluate(Array.from({ length: 5 }, () => pass({ kind: 'language' })), NOW)
    assert.ok(big.points >= 1000 && big.level.key === 'master' && big.next === null)
    assert.ok(big.trophies.find((t) => t.key === 'master').earned)
})
