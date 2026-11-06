import test from 'node:test'
import assert from 'node:assert/strict'
import { needsTwoFactor } from './twoFactorRule.js'

test('nobody is asked when the rule is off', () => {
    assert.equal(needsTwoFactor('', ['admin']), false)
    assert.equal(needsTwoFactor(undefined, ['crm.admin']), false)
})
test('administrators are asked by both rules', () => {
    assert.equal(needsTwoFactor('admins', ['admin']), true)
    assert.equal(needsTwoFactor('sensitive', ['crm.admin']), true)
})
test('people who see money or the vault are asked only by the wider rule', () => {
    assert.equal(needsTwoFactor('admins', ['crm.passwords.view']), false)
    assert.equal(needsTwoFactor('sensitive', ['crm.passwords.view']), true)
    assert.equal(needsTwoFactor('sensitive', ['crm.payroll.view']), true)
    assert.equal(needsTwoFactor('sensitive', ['crm.tasks.view']), false)
})
