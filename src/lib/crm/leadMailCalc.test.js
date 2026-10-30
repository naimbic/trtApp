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

const EQUALS_FORM = `Nouvelle demande d’audit SEO
cat : audit-seo

Nom = Ismail Harrouchi
Email = ismail@natura-volt.ma
Entreprise = Natura Volt
Site web = https://natura-volt.ma
Services = Audit SEO, Meta Ads
MESSAGE = Bonjour,
nous voulons auditer notre site.

Page = https://trtdigital.ma/audit-seo`

test('a form written with "Label = value" lines fills the lead fields', () => {
    const p = parseForm(EQUALS_FORM)
    assert.equal(p.fields.name, 'Ismail Harrouchi')
    assert.equal(p.fields.email, 'ismail@natura-volt.ma')
    assert.equal(p.fields.company, 'Natura Volt')
    assert.equal(p.fields.website, 'https://natura-volt.ma')
    assert.equal(p.fields.service, 'Audit SEO, Meta Ads')
    assert.match(p.fields.message, /nous voulons auditer/)
    assert.deepEqual(p.extras.map(([l]) => l), ['cat', 'Page']) // nothing is lost: the category and the page go to the description
    const lead = buildLead({ subject: 'trtDigital - Social Ads (Meta / TikTok) - Harrouchi Ismail', fromAddress: 'noreply@trtdigital.ma' }, p)
    assert.equal(lead.name, 'Ismail Harrouchi'); assert.equal(lead.company, 'Natura Volt'); assert.equal(lead.email, 'ismail@natura-volt.ma')
    assert.match(lead.description, /Service: Audit SEO/); assert.match(lead.description, /Page: https:\/\/trtdigital\.ma\/audit-seo/); assert.match(lead.description, /cat: audit-seo/)
})

test('an equals-sign form counts as a form (two labelled lines)', () => {
    const p = parseForm('Nom = Ali\nEmail = ali@x.ma')
    assert.equal(judge({ subject: 's', text: 'Nom = Ali\nEmail = ali@x.ma' }, {}, p).ok, true)
})

test('a plain-text email with only equals signs is read as it is', () => {
    assert.equal(emailText('Nom = Ali\nEmail = a@x.ma', ''), 'Nom = Ali\nEmail = a@x.ma')
})

// the real notification of the trtDigital site form: an HTML table, a "MESSAGE" heading with its text under it, section titles in capitals
const SITE_HTML = `<div><h1>TRTDIGITAL</h1><h2>Nouvelle demande d’audit SEO</h2><span>audit-seo</span>
<h3>COORDONNÉES</h3>
<table><tr><td>Nom</td><td>Harrouchi Ismail</td></tr><tr><td>Email</td><td><a href="mailto:ismail.harrouchi@strasforma.fr">ismail.harrouchi@strasforma.fr</a></td></tr><tr><td>Entreprise</td><td>Strasforma</td></tr><tr><td>Site web</td><td><a href="https://www.strasforma.fr/">https://www.strasforma.fr/</a></td></tr></table>
<h3>PROJET</h3>
<table><tr><td>Services</td><td>Social Ads (Meta / TikTok)</td></tr><tr><td>Budget</td><td>5 000 – 15 000 MAD / mois</td></tr><tr><td>Délai</td><td>Dès que possible</td></tr></table>
<div><div>MESSAGE</div><div>On a actuellement une campagne sur Meta avec une agence en France.</div></div>
<div><p><b>Page :</b> <a href="https://www.trtdigital.ma/#audit">https://www.trtdigital.ma/#audit</a></p><p><b>IP :</b> 162.158.95.49</p><p><b>Navigateur :</b> Mozilla/5.0</p><p><b>Reçu le :</b> vendredi 30 octobre 2026 à 09:50</p></div></div>`

test('the site notification (HTML table, MESSAGE heading, section titles) fills every field', () => {
    const p = parseForm(emailText('', SITE_HTML))
    assert.equal(p.fields.name, 'Harrouchi Ismail')
    assert.equal(p.fields.email, 'ismail.harrouchi@strasforma.fr')
    assert.equal(p.fields.company, 'Strasforma')
    assert.equal(p.fields.website, 'https://www.strasforma.fr/') // the next section title ("PROJET") is not glued to it
    assert.equal(p.fields.service, 'Social Ads (Meta / TikTok)')
    assert.match(p.fields.message, /^On a actuellement une campagne/)
    assert.deepEqual(p.extras.map(([l]) => l), ['Budget', 'Délai', 'Page']) // IP, browser and received-at stay out of the description
    const lead = buildLead({ subject: 'trtDigital - Social Ads (Meta / TikTok) - Harrouchi Ismail', fromAddress: 'commercial@trtdigital.ma' }, p)
    assert.equal(lead.name, 'Harrouchi Ismail'); assert.equal(lead.company, 'Strasforma'); assert.equal(lead.website, 'https://www.strasforma.fr/')
    assert.match(lead.description, /^On a actuellement/); assert.match(lead.description, /Budget: 5 000/); assert.doesNotMatch(lead.description, /162\.158/)
})
