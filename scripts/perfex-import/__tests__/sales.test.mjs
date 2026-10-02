import assert from 'node:assert/strict'
import m from '../tables/sales.mjs'
import { oid } from '../lib.mjs'

// money survives
assert.equal(m.invoices.map({ id: '1', total: '1234.50' }).total, 1234.5)
assert.equal(m.invoices.map({ id: '1', total: '0.10', subtotal: '0.20' }).subtotal, 0.2)
assert.equal(m.expenses.map({ id: '1', amount: '99999999999.99' }).amount, 99999999999.99)

// invoice
const inv = m.invoices.map({
    id: '7', sent: '1', datesend: '2019-02-05 10:00:00', clientid: '12', number: '42', prefix: 'INV-',
    number_format: '2', datecreated: '2019-02-04 09:30:00', date: '2019-02-04', duedate: '2019-03-04',
    currency: '3', subtotal: '1000.00', total_tax: '200.00', total: '1200.00', adjustment: '0.00',
    addedfrom: '1', hash: 'abc', status: '3', discount_percent: '0.00', discount_total: '0.00',
    discount_type: '', recurring: '0', sale_agent: '2', project_id: '0', subscription_id: '0',
    include_shipping: '0', show_shipping_on_invoice: '1', show_quantity_as: '1', cancel_overdue_reminders: '0',
    is_recurring_from: '5', billing_country: '0',
})
assert.equal(inv.id, oid('invoices', 7))
assert.equal(inv.legacyId, 7)
assert.equal(inv.clientId, oid('clients', 12))
assert.equal(inv.currencyId, oid('currencies', 3))
assert.equal(inv.saleAgentId, oid('staff', 2))
assert.equal(inv.projectId, null)
assert.equal(inv.isRecurringFrom, oid('invoices', 5))
assert.equal(inv.prefix, 'INV-'); assert.equal(inv.number, 42); assert.equal(inv.numberFormat, 2)
assert.equal(inv.status, 3)
assert.equal(inv.sent, true)
assert.equal(inv.createdAt.toISOString(), '2019-02-04T09:30:00.000Z')
assert.equal(inv.dueDate.toISOString(), '2019-03-04T00:00:00.000Z')
assert.equal(inv.billingCountry, 0)
// missing datecreated => no createdAt key (Prisma default)
assert.ok(!('createdAt' in m.invoices.map({ id: '1', datecreated: '0000-00-00 00:00:00' })))

// payment
const pay = m.invoicepaymentrecords.map({
    id: '9', invoiceid: '7', amount: '600.00', paymentmode: '2', paymentmethod: '', date: '2019-02-20',
    daterecorded: '2019-02-21 08:00:00', note: '', transactionid: 'TX1',
})
assert.equal(pay.invoiceId, oid('invoices', 7))
assert.equal(pay.paymentModeId, oid('payment_modes', 2))
assert.equal(pay.amount, 600)
assert.equal(pay.paymentDate.toISOString(), '2019-02-20T00:00:00.000Z')
assert.equal(pay.createdAt.toISOString(), '2019-02-21T08:00:00.000Z')
assert.equal(pay.paymentMethod, null)

// itemable polymorphism
const rel = (t, id) => m.itemable.map({ id: '1', rel_type: t, rel_id: id, description: 'x', qty: '2.00', rate: '10.50', item_order: '1' })
assert.equal(rel('invoice', '7').relId, oid('invoices', 7))
assert.equal(rel('estimate', '3').relId, oid('estimates', 3))
assert.equal(rel('proposal', '4').relId, oid('proposals', 4))
assert.equal(rel('credit_note', '5').relId, oid('creditnotes', 5))
assert.equal(rel('invoice', '7').qty, 2)
assert.equal(rel('invoice', '7').rate, 10.5)
assert.equal(rel('invoice', '7').relType, 'invoice')

// item_tax
const it = m.item_tax.map({ id: '1', itemid: '11', rel_id: '7', rel_type: 'invoice', taxrate: '20.00', taxname: 'TVA' })
assert.equal(it.itemableId, oid('itemable', 11))
assert.equal(it.relId, oid('invoices', 7))
assert.equal(it.taxRate, 20)

// estimate
const est = m.estimates.map({
    id: '5', clientid: '12', number: '3', prefix: 'EST-', number_format: '1', datecreated: '2020-01-01 00:00:00',
    date: '2020-01-01', expirydate: '2020-01-31', currency: '1', subtotal: '10.00', total_tax: '2.00', total: '12.00',
    status: '4', invoiceid: '7', project_id: '0', acceptance_date: '0000-00-00 00:00:00',
})
assert.equal(est.id, oid('estimates', 5))
assert.equal(est.invoiceId, oid('invoices', 7))
assert.equal(est.expiryDate.toISOString(), '2020-01-31T00:00:00.000Z')
assert.equal(est.acceptanceDate, null)
assert.equal(est.status, 4)

// proposal rel
assert.equal(m.proposals.map({ id: '1', rel_type: 'lead', rel_id: '8', status: '3' }).relId, oid('leads', 8))
assert.equal(m.proposals.map({ id: '1', rel_type: 'customer', rel_id: '8' }).relId, oid('clients', 8))

// expense
const ex = m.expenses.map({
    id: '3', category: '2', currency: '1', amount: '150.75', tax: '1', tax2: '0', clientid: '12', project_id: '4',
    invoiceid: '7', paymentmode: '2', date: '2021-05-05', dateadded: '2021-05-06 10:00:00', billable: '1', addedfrom: '1',
})
assert.equal(ex.categoryId, oid('expenses_categories', 2))
assert.equal(ex.taxId, oid('taxes', 1))
assert.equal(ex.tax2Id, null)
assert.equal(ex.clientId, oid('clients', 12))
assert.equal(ex.projectId, oid('projects', 4))
assert.equal(ex.invoiceId, oid('invoices', 7))
assert.equal(ex.paymentModeId, oid('payment_modes', 2))
assert.equal(ex.amount, 150.75)
assert.equal(ex.billable, true)

// legacy purchasing rows
const pv = m.pur_vendor.map({ userid: '4', company: 'ACME' })
assert.equal(pv.table, 'pur_vendor'); assert.equal(pv.legacyId, '4'); assert.equal(pv.data.company, 'ACME')

// every mapper is idempotent / pure
for (const [t, def] of Object.entries(m)) {
    const row = { id: '1', userid: '1' }
    assert.deepEqual(def.map(row), def.map(row), t)
    assert.ok(def.model && def.id, t)
}
console.log('sales.test.mjs OK')
