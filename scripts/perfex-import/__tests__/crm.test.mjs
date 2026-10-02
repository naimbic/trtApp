import assert from 'node:assert/strict'
import crm from '../tables/crm.mjs'
import { oid } from '../lib.mjs'

const client = crm.clients.map({
    userid: '12', company: 'Acme SARL', vat: 'ICE123', phonenumber: '0612345678', country: '149',
    city: 'Casablanca', zip: '20000', state: null, address: '1 rue X', website: 'https://acme.ma',
    datecreated: '2020-05-04 10:30:00', active: '1', leadid: '7', billing_street: 'B', billing_country: '149',
    shipping_street: '', default_currency: '2', show_primary_contact: '0', registration_confirmed: '1', addedfrom: '3',
})
assert.equal(client.id, oid('clients', 12))
assert.equal(client.legacyId, 12)
assert.equal(client.createdAt.toISOString(), '2020-05-04T10:30:00.000Z')
assert.equal(client.active, true)
assert.equal(client.showPrimaryContact, false)
assert.equal(client.leadId, oid('leads', 7))
assert.equal(client.defaultCurrencyId, oid('currencies', 2))
assert.equal(client.addedFrom, oid('staff', 3))
assert.equal(client.shippingStreet, null)
assert.equal(client.country, 149)

const contact = crm.contacts.map({
    id: '5', userid: '12', is_primary: '1', firstname: 'Ali', lastname: 'B', email: 'a@acme.ma',
    datecreated: '2020-05-04 10:31:00', password: '$2a$08$hash', last_login: '0000-00-00 00:00:00',
    active: '1', invoice_emails: '1', task_emails: '0',
})
assert.equal(contact.clientId, oid('clients', 12))
assert.equal(contact.passwordHash, '$2a$08$hash')
assert.equal(contact.isPrimary, true)
assert.equal(contact.lastLogin, null)
assert.equal(contact.taskEmails, false)
assert.ok(!('password' in contact))

const lead = crm.leads.map({
    id: '7', name: 'Lead One', status: '2', source: '4', assigned: '1', dateadded: '2021-01-02 03:04:05',
    lastcontact: null, lost: '0', junk: '1', leadorder: '3', client_id: '12', date_converted: '2021-02-01 00:00:00',
    is_public: '0', email: 'l@x.ma',
})
assert.equal(lead.createdAt.toISOString(), '2021-01-02T03:04:05.000Z')
assert.equal(lead.statusId, oid('leads_status', 2))
assert.equal(lead.sourceId, oid('leads_sources', 4))
assert.equal(lead.clientId, oid('clients', 12))
assert.equal(lead.junk, true)
assert.equal(lead.lost, false)
assert.equal(lead.leadOrder, 3)
assert.equal(lead.lastContact, null)
assert.equal(lead.assigned, oid('staff', 1))

const adm = crm.customer_admins.map({ staff_id: '1', customer_id: '12', date_assigned: '2020-01-01 00:00:00' })
assert.equal(adm.id, oid('customer_admins', '1:12'))
console.log('crm mapper tests passed')
