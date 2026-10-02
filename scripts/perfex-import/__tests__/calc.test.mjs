import assert from 'node:assert/strict'
import { calcDocument, invoiceStatusFromPayments, formatDocumentNumber, round2 } from '../../../src/lib/crm/sales/calc.js'

assert.equal(round2(1.005), 1.01)
assert.equal(round2(1234.5), 1234.5)

// simple: 2 x 100 + 20% tax
let r = calcDocument({ items: [{ qty: 2, rate: 100, taxes: [{ name: 'TVA', rate: 20 }] }] })
assert.deepEqual(r, { subtotal: 200, discountTotal: 0, taxes: [{ name: 'TVA', rate: 20, total: 40 }], totalTax: 40, total: 240 })

// per-line tax rounding: 3 lines of 0.33 @ 7.5% -> each tax 0.02475 -> 0.02
r = calcDocument({ items: [1, 2, 3].map(() => ({ qty: 1, rate: 0.33, taxes: [{ name: 'T', rate: 7.5 }] })) })
assert.equal(r.totalTax, 0.06)
assert.equal(r.subtotal, 0.99)
assert.equal(r.total, 1.05)

// discount before tax (10%)
r = calcDocument({ items: [{ qty: 1, rate: 1000, taxes: [{ name: 'TVA', rate: 20 }] }], discountPercent: 10, discountType: 'before_tax' })
assert.equal(r.discountTotal, 100); assert.equal(r.totalTax, 180); assert.equal(r.total, 1080)

// discount after tax (10%)
r = calcDocument({ items: [{ qty: 1, rate: 1000, taxes: [{ name: 'TVA', rate: 20 }] }], discountPercent: 10, discountType: 'after_tax' })
assert.equal(r.discountTotal, 120); assert.equal(r.totalTax, 200); assert.equal(r.total, 1080)

// fixed discount before tax distributed proportionally; adjustment
r = calcDocument({
    items: [{ qty: 1, rate: 600, taxes: [{ name: 'A', rate: 10 }] }, { qty: 1, rate: 400, taxes: [{ name: 'B', rate: 20 }] }],
    discountFixed: 100, discountType: 'before_tax', adjustment: -5.5,
})
assert.equal(r.subtotal, 1000)
assert.equal(r.taxes.find((t) => t.name === 'A').total, 54)
assert.equal(r.taxes.find((t) => t.name === 'B').total, 72)
assert.equal(r.total, 1000 + 126 - 100 - 5.5)

// taxes aggregate by name+rate, multiple taxes per line
r = calcDocument({ items: [{ qty: 1, rate: 100, taxes: [{ name: 'TVA', rate: 20 }, { name: 'X', rate: 5 }] }, { qty: 1, rate: 50, taxes: [{ name: 'TVA', rate: 20 }] }] })
assert.equal(r.taxes.length, 2); assert.equal(r.taxes[0].total, 30); assert.equal(r.total, 150 + 30 + 5)

// tax modes
r = calcDocument({ items: [{ qty: 1, rate: 120, taxes: [{ name: 'TVA', rate: 20 }] }], taxMode: 'inclusive' })
assert.equal(r.subtotal, 100); assert.equal(r.total, 120)
r = calcDocument({ items: [{ qty: 1, rate: 120, taxes: [{ name: 'TVA', rate: 20 }] }], taxMode: 'none' })
assert.equal(r.total, 120); assert.equal(r.totalTax, 0)
assert.deepEqual(calcDocument({}), { subtotal: 0, discountTotal: 0, taxes: [], totalTax: 0, total: 0 })

// status
const now = new Date('2026-10-02T12:00:00Z')
const inv = { status: 1, total: 1000, dueDate: '2026-11-01' }
assert.equal(invoiceStatusFromPayments(inv, [], now), 1)
assert.equal(invoiceStatusFromPayments(inv, [{ amount: 400 }], now), 3)
assert.equal(invoiceStatusFromPayments(inv, [{ amount: 400 }, { amount: 600 }], now), 2)
assert.equal(invoiceStatusFromPayments({ ...inv, dueDate: '2026-09-01' }, [], now), 4)
assert.equal(invoiceStatusFromPayments({ ...inv, dueDate: '2026-10-02' }, [], now), 1) // due today is not overdue
assert.equal(invoiceStatusFromPayments({ ...inv, dueDate: '2026-09-01' }, [{ amount: 1000 }], now), 2)
assert.equal(invoiceStatusFromPayments({ ...inv, status: 5 }, [{ amount: 1000 }], now), 5)
assert.equal(invoiceStatusFromPayments({ ...inv, status: 6 }, [], now), 6)
assert.equal(invoiceStatusFromPayments({ ...inv, status: 6 }, [{ amount: 10 }], now), 3)
assert.equal(invoiceStatusFromPayments({ ...inv, creditsApplied: 1000 }, [], now), 2)
assert.equal(invoiceStatusFromPayments({ status: 1, total: 0.3, dueDate: null }, [{ amount: 0.1 }, { amount: 0.2 }], now), 2) // float safety

// numbering
assert.equal(formatDocumentNumber({ prefix: 'INV-', number: 42, numberFormat: 1 }), 'INV-000042')
assert.equal(formatDocumentNumber({ prefix: 'INV-', number: 42, numberFormat: 2, date: '2019-02-04' }), 'INV-2019/000042')
assert.equal(formatDocumentNumber({ prefix: null, number: 1234567, numberFormat: 1 }), '1234567')
assert.equal(formatDocumentNumber({ prefix: 'EST-', number: 7 }), 'EST-000007')
console.log('calc.test.mjs OK')
