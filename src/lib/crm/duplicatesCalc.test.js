import test from 'node:test'
import assert from 'node:assert/strict'
import { normEmail, normPhone, normCompany, reasons } from './duplicatesCalc.js'

test('emails ignore case and spaces', () => {
    assert.equal(normEmail('  Info@ACME.ma '), 'info@acme.ma')
    assert.deepEqual(reasons({ email: 'A@b.ma' }, { email: ' a@B.MA' }), ['email'])
})
test('phones match whatever the country code or the zero in front', () => {
    assert.equal(normPhone('+212 6 61-23-45-67'), '661234567')
    assert.equal(normPhone('0661234567'), '661234567')
    assert.deepEqual(reasons({ phone: '+212661234567' }, { phone: '06 61 23 45 67' }), ['phone'])
    assert.equal(normPhone('12345'), '') // too short to compare
})
test('company names ignore case, accents, punctuation and legal endings', () => {
    assert.equal(normCompany('Société Atlas S.A.R.L.'), 'societeatlas')
    assert.deepEqual(reasons({ company: 'ATLAS Industries SARL' }, { company: 'Atlas  industries' }), ['company'])
    assert.equal(normCompany('AB'), '')
})
test('different people do not match', () => {
    assert.deepEqual(reasons({ email: 'a@x.ma', phone: '0661111111', company: 'Rif' }, { email: 'b@x.ma', phone: '0662222222', company: 'Atlas' }), [])
})
