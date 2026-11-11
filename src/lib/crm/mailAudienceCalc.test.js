import test from 'node:test'
import assert from 'node:assert/strict'
import { mailAudience } from './mailAudienceCalc.js'

const can = (a, f, c) => a.includes('admin') || a.includes(`${f}.${c}`)
const scope = (a, f) => (can(a, f, 'view') ? 'all' : can(a, f, 'view_own') ? 'own' : null)
const P = (id, ...auth) => ({ id, auth })
const base = { isLead: true, can, scope }

test('everyone who may open the Mails tab and sees the lead is told, senders and readers alike', () => {
    const people = [
        P('boss', 'admin'),
        P('seller', 'leads.view', 'lead_tabs.tab_mails', 'lead_mails.send'),
        P('reader', 'leads.view', 'lead_tabs.tab_mails'),
        P('owner', 'leads.view_own', 'lead_tabs.tab_mails'),
    ]
    assert.deepEqual(mailAudience({ ...base, own: ['owner'], people }).sort(), ['boss', 'owner', 'reader', 'seller'])
})

test('without the Mails tab right nobody is told, even the owner', () => {
    const people = [P('owner', 'leads.view_own', 'lead_tabs.tab_profile'), P('seller', 'leads.view', 'lead_mails.send')]
    assert.deepEqual(mailAudience({ ...base, own: ['owner'], people }), [])
})

test('a person who only sees own leads is told only about the leads they belong to', () => {
    const people = [P('s1', 'leads.view_own', 'lead_tabs.tab_mails'), P('s2', 'leads.view_own', 'lead_tabs.tab_mails')]
    assert.deepEqual(mailAudience({ ...base, own: ['s1'], people }), ['s1'])
    assert.deepEqual(mailAudience({ ...base, own: [], isPublic: true, people }).sort(), ['s1', 's2'])
})

test('the responsible person comes first; clients use the customer rights', () => {
    const people = [P('a', 'customers.view', 'client_tabs.tab_mails', 'client_mails.send'), P('b', 'customers.view_own', 'client_tabs.tab_mails'), P('c', 'leads.view', 'lead_tabs.tab_mails', 'lead_mails.send')]
    assert.deepEqual(mailAudience({ isLead: false, can, scope, own: ['b'], responsible: 'b', people }), ['b', 'a'])
})
