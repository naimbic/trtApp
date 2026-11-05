import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanOffer, offerTotals, offerPrice, OPTION_PRESETS, OFFER_PACKS } from './ideaOffer.js'

test('offer: a monthly SaaS over 3 years with options, a setup fee and a discount', () => {
    const t = offerTotals({ kind: 'saas', billing: 'monthly', term: 3, price: 100, setupFee: 200, discountPct: 10, options: [
        { label: 'Support', billing: 'monthly', price: 20, qty: 1 },
        { label: 'Domain', billing: 'yearly', price: 120, qty: 1 },
        { label: 'Training', billing: 'one_shot', price: 300, qty: 1 },
        { label: 'Off', billing: 'monthly', price: 999, qty: 1, on: false },
    ] })
    // monthly: (100 + 20 + 120/12) * 0.9 = 117; once: (200 + 300) * 0.9 = 450
    assert.equal(t.monthly, 117)
    assert.equal(t.oneOff, 450)
    assert.equal(t.firstYear, 450 + 117 * 12)
    assert.equal(t.months, 36)
    assert.equal(t.contract, 450 + 117 * 36)
    assert.equal(t.open, false)
})

test('offer: a one-time price has no contract and no monthly part', () => {
    const t = offerTotals({ kind: 'development', billing: 'one_shot', term: 4, price: 5000, options: [{ label: 'Hosting', billing: 'monthly', price: 30, qty: 2 }] })
    assert.equal(cleanOffer({ billing: 'one_shot', term: 4, price: 1 }).term, 0)
    assert.equal(t.oneOff, 5000)
    assert.equal(t.monthly, 60) // the option still recurs
    assert.equal(t.contract, null) // no term, so no contract total
    assert.equal(t.open, true) // recurring and no end date
})

test('offer: open contract and quarterly / yearly equivalents', () => {
    assert.equal(offerTotals({ billing: 'quarterly', term: 0, price: 300 }).monthly, 100)
    assert.equal(offerTotals({ billing: 'yearly', term: 2, price: 1200 }).monthly, 100)
    assert.equal(offerTotals({ billing: 'monthly', term: 0, price: 50 }).open, true)
    assert.equal(offerTotals({ billing: 'monthly', term: 5, price: 50 }).contract, 3000)
})

test('offer: unknown words and bad numbers are cleaned, and an empty offer is nothing', () => {
    assert.equal(cleanOffer(null), null)
    assert.equal(cleanOffer({ billing: 'weekly', kind: 'magic', price: 'abc', options: [{ label: '  ' }] }), null)
    const o = cleanOffer({ billing: 'weekly', kind: 'magic', price: '99', term: 9, options: [{ label: 'x', billing: 'daily', price: -5, qty: 0 }] })
    assert.equal(o.billing, 'one_shot')
    assert.equal(o.kind, 'service')
    assert.equal(o.options[0].billing, 'one_shot')
    assert.equal(o.options[0].price, 0)
    assert.equal(o.options[0].qty, 1)
    assert.equal(cleanOffer({ billing: 'monthly', term: 9, price: 5 }).term, 1)
    assert.equal(cleanOffer({ billing: 'monthly', price: 5, discountPct: 500 }).discountPct, 100)
})

test('offer: the idea price is the first year; presets and packs only use known options', () => {
    assert.equal(offerPrice({ billing: 'monthly', term: 1, price: 10 }), 120)
    assert.equal(offerPrice(null), null)
    const keys = new Set(OPTION_PRESETS.flatMap((g) => g.items.map((i) => i[0])))
    assert.equal(keys.size, OPTION_PRESETS.flatMap((g) => g.items).length, 'option keys are unique')
    for (const p of OFFER_PACKS) for (const k of p.options) assert.ok(keys.has(k), `${p.key} uses ${k}`)
})
