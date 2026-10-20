import test from 'node:test'
import assert from 'node:assert/strict'
import { extras } from './memberFields.js'

test('dates are read and checked against each other', () => {
    const d = extras({ hireDate: '2026-01-05', fireDate: '2026-09-30' }, false)
    assert.equal(d.hireDate.toISOString().slice(0, 10), '2026-01-05')
    assert.throws(() => extras({ fireDate: '2025-01-01' }, false, { hireDate: new Date('2026-01-05') }), /before the hire date/)
    assert.throws(() => extras({ hireDate: 'nope' }, false), /not valid/)
    assert.equal(extras({ fireDate: '' }, false).fireDate, null)
})

test('salary, bank and CNSS are for super administrators only', () => {
    assert.throws(() => extras({ salary: 5000 }, false), (e) => e.status === 403)
    assert.throws(() => extras({ rib: '123' }, false), (e) => e.status === 403)
    const d = extras({ salary: '5000', salaryCurrencyId: 'c1', payDay: '10', rib: '011 780 0000123456789012 34', cnss: true }, true)
    assert.equal(d.salary, 5000)
    assert.equal(d.payDay, 10)
    assert.equal(d.rib, '011780000012345678901234')
    assert.equal(d.cnss, true)
    assert.equal(extras({ salary: '' }, true).salary, null)
})

test('invalid pay details are refused', () => {
    assert.throws(() => extras({ salary: -1 }, true), /positive/)
    assert.throws(() => extras({ payDay: 40 }, true), /1 to 31/)
    assert.throws(() => extras({ rib: 'ab' }, true), /RIB/)
})
