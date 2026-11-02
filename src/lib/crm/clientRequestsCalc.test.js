import test from 'node:test'
import assert from 'node:assert/strict'
import { STATUSES, STATUS_LABEL, STATUS_COLOR, TYPES, isOpen, cleanStatus, cleanType, cleanPriority, cleanUrl, clientCanReopen, codeOf } from './clientRequestsCalc.js'

test('every status has a label and a colour; done and declined are the closed ones', () => {
    for (const s of STATUSES) { assert.ok(STATUS_LABEL[s], s); assert.match(STATUS_COLOR[s], /^#[0-9a-f]{6}$/i) }
    assert.deepEqual(STATUSES.filter((s) => !isOpen(s)), ['done', 'declined'])
    assert.equal(clientCanReopen('done'), true)
    assert.equal(clientCanReopen('doing'), false)
})
test('status, kind and priority fall back to safe values', () => {
    assert.equal(cleanStatus('planned'), 'planned')
    assert.equal(cleanStatus('nope'), 'new')
    assert.equal(cleanStatus('nope', 'doing'), 'doing')
    assert.equal(cleanType('bug'), 'bug')
    assert.equal(cleanType('__proto__'), 'other')
    assert.ok(Object.keys(TYPES).includes('integration'))
    assert.equal(cleanPriority(9), 4)
    assert.equal(cleanPriority('x'), 2)
    assert.equal(cleanPriority(0), 2)
})
test('the page address is a web address only', () => {
    assert.equal(cleanUrl('example.com/a'), 'https://example.com/a')
    assert.equal(cleanUrl('javascript:alert(1)'), null)
    assert.equal(cleanUrl('ftp://x.com/f'), null)
    assert.equal(cleanUrl('   '), null)
    assert.equal(cleanUrl('localhost'), null)
})
test('the reference reads REQ-12', () => {
    assert.equal(codeOf(12), 'REQ-12')
    assert.equal(codeOf(0), 'REQ-0')
})
