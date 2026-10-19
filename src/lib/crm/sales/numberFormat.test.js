import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDocumentNumber } from './calc.js'

test('format 5 reads PREFIX - number - month - year', () => {
    assert.equal(formatDocumentNumber({ prefix: 'FA -', number: 89, numberFormat: 5, date: '2026-09-14', padding: 4 }), 'FA - 0089 - 09 - 26')
})
test('format 4 is unchanged', () => {
    assert.equal(formatDocumentNumber({ prefix: 'FA -', number: 89, numberFormat: 4, date: '2026-09-14', padding: 3 }), 'FA - 089-09-2026')
})
