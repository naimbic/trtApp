import test from 'node:test'
import assert from 'node:assert/strict'
import { parseForm, judge, buildLead, emailText, customLabels } from './leadMailCalc.js'

const FORM = `Name: Sara Benali
Email: sara@acme.ma
Téléphone: +212 6 12 34 56 78
Société: Acme
Service: Site e-commerce
Message: Bonjour,
je voudrais un devis pour une boutique en ligne.
Budget: 20000 MAD`

test('a French/English contact form is read into lead fields', () => {
    const p = parseForm(FORM)
    assert.equal(p.fields.name, 'Sara Benali')
    assert.equal(p.fields.email, 'sara@acme.ma')
    assert.equal(p.fields.phone, '+212 6 12 34 56 78')
    assert.equal(p.fields.company, 'Acme')
    assert.match(p.fields.message, /devis pour une boutique/)
    assert.equal(p.extras.length, 1) // Budget is kept, nothing is lost
})

test('an HTML table form is turned into label / value pairs', () => {
    const html = '<table><tr><td>Name</td><td>Omar</td></tr><tr><td>E-mail</td><td><a href="mailto:o@x.com">o@x.com</a></td></tr><tr><td>Phone</td><td>0600000000</td></tr></table>'
    const p = parseForm(emailText('', html))
    assert.equal(p.fields.name, 'Omar'); assert.equal(p.fields.email, 'o@x.com'); assert.equal(p.fields.phone, '0600000000')
})

test('only form emails from the chosen sender and subject are leads', () => {
    const p = parseForm(FORM)
    const msg = { fromAddress: 'wordpress@trtmaroc.com', subject: 'Nouveau message de contact', text: FORM }
    assert.equal(judge(msg, { fromFilter: 'wordpress@', subjectFilter: 'contact' }, p).ok, true)
    assert.equal(judge({ ...msg, fromAddress: 'news@spam.com' }, { fromFilter: 'wordpress@' }, p).ok, false)
    assert.equal(judge({ ...msg, subject: 'Invoice 12' }, { subjectFilter: 'contact, devis' }, p).ok, false)
    const chat = { fromAddress: 'a@b.com', subject: 'hi', text: 'Hello, are you free tomorrow?' }
    assert.equal(judge(chat, {}, parseForm(chat.text)).ok, false) // not a form
})

test('the lead keeps every piece of information and falls back to Reply-To for the address', () => {
    const msg = { fromAddress: 'wordpress@trtmaroc.com', replyTo: 'client@x.com', subject: 'Contact', text: 'Name: Ali\nMessage: hi\nBudget: 5' }
    const l = buildLead(msg, parseForm(msg.text))
    assert.equal(l.name, 'Ali'); assert.equal(l.email, 'client@x.com')
    assert.match(l.description, /Budget: 5/)
})

test('the owner can name the labels of a template', () => {
    const map = customLabels('Name = Prénom et nom\nPhone = Mobile client')
    const p = parseForm('Prénom et nom: Zaid\nMobile client: 0611\nEmail: z@z.com', map)
    assert.equal(p.fields.name, 'Zaid'); assert.equal(p.fields.phone, '0611')
})
