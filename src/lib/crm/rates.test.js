import test from 'node:test'
import assert from 'node:assert/strict'
import { ratesOf, toBase, convertRows, tallyWithAll, ALL } from './rates.js'

const cur = [{ id: 'm', name: 'MAD', isDefault: true }, { id: 'e', name: 'EUR', rate: 10.8 }, { id: 'u', name: 'USD' }]
const rt = ratesOf(cur)

test('rates: the base is 1, a currency with a rate converts, one without a rate is reported', () => {
    assert.deepEqual(rt, { baseId: 'm', rates: { m: 1, e: 10.8 }, missing: ['USD'] })
    assert.equal(toBase(100, 'e', rt), 1080)
    assert.equal(toBase(100, 'm', rt), 100)
    assert.equal(toBase(100, null, rt), 100) // no currency counts as the base one
    assert.equal(toBase(100, 'u', rt), null)
})
test('rates: ALL converts every row into the base currency and leaves out the ones without a rate', () => {
    const rows = [{ currencyId: 'm', total: 100 }, { currencyId: 'e', total: 10 }, { currencyId: 'u', total: 999 }]
    assert.deepEqual(convertRows(rows, ['total'], rt).map((r) => [r.currencyId, r.total]), [[ALL, 100], [ALL, 108]])
})
test('rates: the ALL entry sits next to the per-currency ones and counts like them', () => {
    const rows = [{ currencyId: 'm', total: 100 }, { currencyId: 'e', total: 10 }, { currencyId: 'e', total: 5 }]
    const tally = (list) => { const t = {}; for (const r of list) t[r.currencyId] = (t[r.currencyId] || 0) + r.total; return t }
    assert.deepEqual(tallyWithAll(tally, rows, ['total'], rt), { m: 100, e: 15, [ALL]: 262 })
})
test('rates: with no currencies there is no base and nothing to convert', () => {
    assert.deepEqual(ratesOf([]), { baseId: null, rates: {}, missing: [] })
})
