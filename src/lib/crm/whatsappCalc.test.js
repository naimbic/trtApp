import test from 'node:test'
import assert from 'node:assert/strict'
import { explainWhatsapp, tokenAdvice } from './whatsappCalc.js'

test('known Meta errors are explained in plain words', () => {
    assert.match(explainWhatsapp({ code: 190, message: 'Error validating access token: Session has expired' }), /permanent token/)
    assert.match(explainWhatsapp({ code: 131030, message: 'Recipient phone number not in allowed list' }), /allowed/)
    assert.match(explainWhatsapp({ code: 131047, message: 'Re-engagement message' }), /template/)
    assert.match(explainWhatsapp({ code: 132001, message: 'Template name does not exist in the translation' }), /template/)
    assert.match(explainWhatsapp({ code: 131026, message: 'Message undeliverable' }), /not on WhatsApp/)
})
test('an unknown error keeps its own words', () => {
    assert.equal(explainWhatsapp({ code: 999, message: 'Something odd' }), 'Something odd')
    assert.equal(explainWhatsapp({}), 'WhatsApp refused the message')
})
test('a token is renewed before it ends, and only when it can be', () => {
    const now = Date.UTC(2026, 10, 6)
    const sec = (days) => Math.floor((now + days * 86400000) / 1000)
    assert.equal(tokenAdvice({ valid: true, expiresAtSec: 0, nowMs: now }), 'ok') // a permanent token
    assert.equal(tokenAdvice({ valid: true, expiresAtSec: sec(40), canRenew: true, nowMs: now }), 'ok')
    assert.equal(tokenAdvice({ valid: true, expiresAtSec: sec(5), canRenew: true, nowMs: now }), 'renew')
    assert.equal(tokenAdvice({ valid: true, expiresAtSec: sec(5), canRenew: false, nowMs: now }), 'ok')
    assert.equal(tokenAdvice({ valid: true, expiresAtSec: sec(2), canRenew: false, nowMs: now }), 'warn')
    assert.equal(tokenAdvice({ valid: false, canRenew: false, nowMs: now }), 'expired')
    assert.equal(tokenAdvice({ valid: false, canRenew: true, nowMs: now }), 'renew')
})
