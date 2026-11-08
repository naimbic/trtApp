import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanLinks, cleanStatus, cleanKind, codeOf, isOpen } from './clientReportsCalc.js'

test('links: only web addresses, no duplicates', () => {
    const r = cleanLinks([{ url: 'example.com/a', title: ' Doc ' }, { url: 'javascript:alert(1)' }, { url: 'https://example.com/a' }, { url: 'nodot' }, { url: '' }])
    assert.deepEqual(r, [{ url: 'https://example.com/a', title: 'Doc' }])
})
test('status and kind fall back', () => {
    assert.equal(cleanStatus('approved'), 'approved')
    assert.equal(cleanStatus('x'), 'draft')
    assert.equal(cleanKind('strategy'), 'strategy')
    assert.equal(cleanKind('x'), 'report')
})
test('codes and open state', () => {
    assert.equal(codeOf(4, 'strategy'), 'STR-4')
    assert.equal(codeOf(0), '')
    assert.equal(isOpen('sent'), true)
    assert.equal(isOpen('declined'), false)
})
