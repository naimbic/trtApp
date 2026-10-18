import test from 'node:test'
import assert from 'node:assert/strict'
import { lockProblem } from './docLock.js'

test('an unlocked document can always be changed', () => {
    assert.equal(lockProblem({ authority: ['user'], locked: false, noun: 'paid invoice' }), null)
})
test('a locked document is refused to everyone but a super admin', () => {
    assert.match(lockProblem({ authority: ['crm.invoices.edit'], locked: true, noun: 'paid invoice' }), /^LOCKED:/)
})
test('a super admin must confirm first', () => {
    assert.match(lockProblem({ authority: ['crm.admin'], locked: true, noun: 'signed contract' }), /^LOCKED_CONFIRM:/)
    assert.match(lockProblem({ authority: ['admin'], locked: true, force: false, noun: 'signed contract' }), /^LOCKED_CONFIRM:/)
})
test('a super admin who confirmed goes on', () => {
    assert.equal(lockProblem({ authority: ['crm.admin'], locked: true, force: true, noun: 'paid invoice' }), null)
})
