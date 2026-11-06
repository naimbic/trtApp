import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { explainWhatsapp, tokenAdvice, normalizeWhatsappNumber, templateVars, templateProblem, validSignature, failedStatuses } from './whatsappCalc.js'

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

test('"(#100) Invalid parameter" says what is wrong when Meta gives the detail', () => {
    assert.match(explainWhatsapp({ code: 100, message: 'Invalid parameter', error_data: { details: 'Recipient phone number not valid' } }), /country code/)
    assert.match(explainWhatsapp({ code: 100, message: 'Invalid parameter', error_data: { details: 'Number of parameters does not match the expected number of params' } }), /Check the WhatsApp connection/)
    assert.match(explainWhatsapp({ code: 100, message: 'Unsupported post request. Object with ID \'123\' does not exist' }), /Phone number ID/)
    assert.match(explainWhatsapp({ code: 100, message: 'Invalid parameter' }), /invalid parameter/)
})
test('a number is turned into the digits WhatsApp wants', () => {
    assert.deepEqual(normalizeWhatsappNumber('+212 600-000-000'), { to: '212600000000' })
    assert.deepEqual(normalizeWhatsappNumber('00212600000000'), { to: '212600000000' })
    assert.match(normalizeWhatsappNumber('0600000000').error, /country code/)
    assert.match(normalizeWhatsappNumber('12345').error, /phone number/)
})
test('the variables of a template body are counted', () => {
    assert.equal(templateVars([{ type: 'BODY', text: 'Hello {{1}}, your code is {{2}} and {{1}} again' }]), 2)
    assert.equal(templateVars([{ type: 'BODY', text: 'No variable here' }]), 0)
    assert.equal(templateVars([]), 0)
})
test('the template of the settings is checked against the account', () => {
    const list = [{ name: 'notice', language: 'en', status: 'APPROVED', vars: 1 }, { name: 'draft', language: 'fr', status: 'PENDING', vars: 1 }]
    assert.equal(templateProblem(list, 'notice', 'en'), null)
    assert.equal(templateProblem(list, '', 'en'), null)
    assert.match(templateProblem(list, 'nothing', 'en'), /No template called/)
    assert.match(templateProblem(list, 'notice', 'fr'), /not in “fr”/)
    assert.match(templateProblem(list, 'draft', 'fr'), /pending/)
})
test('the webhook signature is checked with the App Secret', () => {
    const body = '{"a":1}'
    const sig = `sha256=${crypto.createHmac('sha256', 's3cret').update(body).digest('hex')}`
    assert.equal(validSignature(body, sig, 's3cret'), true)
    assert.equal(validSignature(body, sig, 'other'), false)
    assert.equal(validSignature(body, '', 's3cret'), false)
})
test('failed deliveries are picked out of a webhook payload', () => {
    const payload = { entry: [{ changes: [{ value: { statuses: [{ status: 'delivered', recipient_id: '1' }, { status: 'failed', recipient_id: '212600000000', timestamp: '1700000000', errors: [{ code: 131047, title: 'Re-engagement message', error_data: { details: 'Message failed to send because more than 24 hours have passed' } }] }] } }] }] }
    const f = failedStatuses(payload)
    assert.equal(f.length, 1)
    assert.equal(f[0].code, 131047)
    assert.equal(f[0].to, '212600000000')
})
