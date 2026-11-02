import test from 'node:test'
import assert from 'node:assert/strict'
import { config, DEFAULTS, tierAmount, qualifies, primeOfMonth, trophyRoom, certKey, monthOf } from './growthPrimes.js'

const d = (s) => new Date(`${s}T10:00:00Z`)
// a goal that counts in November 2026
const good = (o = {}) => ({ id: Math.random().toString(36).slice(2), kind: 'certification', status: 'passed', title: 'Google Ads Search', provider: 'Google', catalogKey: null, createdAt: d('2026-10-01'), approved: true, approvedAt: d('2026-10-02'), passedAt: d('2026-11-03'), verified: true, verifiedAt: d('2026-11-05'), files: 1, ...o })
const named = (n, o = {}) => good({ title: `Cert ${n}`, ...o })

test('tiers: 1 or 2 certificates 200 MAD, 3 to 5 500 MAD, never more than 500', () => {
    assert.equal(tierAmount(0), 0)
    assert.equal(tierAmount(1), 200)
    assert.equal(tierAmount(2), 200)
    assert.equal(tierAmount(3), 500)
    assert.equal(tierAmount(5), 500)
    assert.equal(tierAmount(12), 500)
})
test('settings are kept in a safe range and a tier never exceeds the ceiling', () => {
    const c = config({ cap: '300', tier1: '200', tier2: '900', tier2From: 'x', maxCount: '4' })
    assert.equal(c.cap, 300); assert.equal(c.tier2, 300); assert.equal(c.tier2From, DEFAULTS.tier2From); assert.equal(c.maxCount, 4)
    assert.deepEqual(config({}), DEFAULTS)
    assert.equal(config({ cap: -5 }).cap, 0)
})
test('a goal needs every step: kind, passed, approved before the exam, time, proof, verification', () => {
    assert.equal(qualifies(good()).ok, true)
    assert.match(qualifies(good({ kind: 'course' })).reason, /Only certificates/)
    assert.match(qualifies(good({ status: 'learning' })).reason, /Not passed/)
    assert.match(qualifies(good({ approved: false })).reason, /approve the goal/)
    assert.match(qualifies(good({ approvedAt: d('2026-11-04') })).reason, /after the exam/)
    assert.match(qualifies(good({ createdAt: d('2026-11-01') })).reason, /at least \{n\} days/)
    assert.match(qualifies(good({ files: 0 })).reason, /Attach the certificate/)
    assert.match(qualifies(good({ verified: false, verifiedAt: null })).reason, /not verified/)
})
test('the month is the month of the verification, not a date the member typed', () => {
    const g = [good({ passedAt: d('2026-10-20'), createdAt: d('2026-09-01'), approvedAt: d('2026-09-02'), verifiedAt: d('2026-11-02') })]
    assert.equal(primeOfMonth(g, '2026-11').count, 1)
    assert.equal(primeOfMonth(g, '2026-10').count, 0)
})
test('one or two certificates pay 200, three pay 500, six still pay 500', () => {
    const many = (n) => Array.from({ length: n }, (_, i) => named(i))
    assert.equal(primeOfMonth(many(1), '2026-11').amount, 200)
    assert.equal(primeOfMonth(many(2), '2026-11').amount, 200)
    assert.equal(primeOfMonth(many(3), '2026-11').amount, 500)
    const six = primeOfMonth(many(6), '2026-11')
    assert.equal(six.amount, 500); assert.equal(six.count, 5)
})
test('the same certificate counts once, whatever the title or the month', () => {
    const a = good({ title: 'Google Ads — Search', verifiedAt: d('2026-10-05'), passedAt: d('2026-10-03'), approvedAt: d('2026-09-20'), createdAt: d('2026-09-15') })
    const b = good({ title: 'google ads  search!', verifiedAt: d('2026-11-05') })
    assert.equal(certKey(a), certKey(b))
    assert.equal(primeOfMonth([a, b], '2026-10').count, 1)
    const nov = primeOfMonth([a, b], '2026-11')
    assert.equal(nov.count, 0)
    assert.ok(nov.notCounted.some((x) => /already counted/.test(x.reason)))
    // two names of the same catalog item
    assert.equal(certKey(good({ catalogKey: 'x', title: 'A' })), certKey(good({ catalogKey: 'x', title: 'B' })))
})
test('trophy prizes paid in the month use the same ceiling', () => {
    const three = [named(1), named(2), named(3)]
    assert.equal(primeOfMonth(three, '2026-11', { trophiesPaid: 300 }).amount, 200)
    assert.equal(primeOfMonth(three, '2026-11', { trophiesPaid: 500 }).amount, 0)
    assert.equal(trophyRoom({ primePaid: 200, trophiesPaid: 100 }), 200)
    assert.equal(trophyRoom({ primePaid: 500 }), 0)
})
test('what was paid is not paid again, a third certificate pays the difference', () => {
    const two = [named(1), named(2)]
    assert.equal(primeOfMonth(two, '2026-11', { paid: 200 }).due, 0)
    const three = [...two, named(3)]
    const r = primeOfMonth(three, '2026-11', { paid: 200 })
    assert.equal(r.amount, 500); assert.equal(r.due, 300)
})
test('the member is told what is missing for the next tier', () => {
    assert.deepEqual(primeOfMonth([named(1)], '2026-11').next, { more: 2, amount: 500 })
    assert.equal(primeOfMonth([named(1), named(2), named(3)], '2026-11').next, null)
    assert.equal(monthOf(d('2026-11-30')), '2026-11')
})
