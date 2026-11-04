import test from 'node:test'
import assert from 'node:assert/strict'
import { T, textsFor, when, richMessage } from './notifyMailCalc.js'

test('every language has the same keys as English', () => {
    const keys = Object.keys(T.english).sort()
    for (const l of Object.keys(T)) assert.deepEqual(Object.keys(T[l]).sort(), keys, l)
    for (const l of Object.keys(T)) for (const k of ['kinds', 'priorities', 'projectStatus']) assert.deepEqual(Object.keys(T[l][k]).sort(), Object.keys(T.english[k]).sort(), `${l}.${k}`)
})

test('an unknown language falls back to English', () => { assert.equal(textsFor('german'), T.english); assert.equal(textsFor('french').open, 'Ouvrir dans le CRM') })

test('dates are written in the time zone of the company, in the language of the person', () => {
    const d = Date.UTC(2026, 10, 4, 9, 30)
    assert.match(when(d, { tz: 'Africa/Casablanca' }), /04 Nov 2026/)
    assert.match(when(d, { time: false, language: 'french', tz: 'UTC' }), /4 nov\.? 2026|04 nov\.? 2026/i)
    assert.equal(when(null), '')
})

const card = { kind: 'task', title: 'Prepare the offer', rows: [['Status', 'In progress'], ['Due', '05 Nov 2026']], excerpt: 'A short extract' }

test('the message shows what it is, the details and a button; the text of people is escaped and braces are not merge fields', () => {
    const h = richMessage({ baseUrl: 'https://crm.example', L: T.english, name: 'Sara', tone: 'warn', heading: 'Task deadline', intro: 'Due soon.', card: { ...card, title: '<b>{companyname}</b> x' }, quote: 'my {note} <i>', quoteLabel: 'Your note', link: '/crm/tasks/1' })
    assert.match(h, /Task deadline/); assert.match(h, /Hello Sara,/); assert.match(h, /In progress/); assert.match(h, /A short extract/)
    assert.match(h, /href="https:\/\/crm\.example\/crm\/tasks\/1"/)
    assert.doesNotMatch(h, /<b>\{companyname\}/); assert.match(h, /&lt;b&gt;&#123;companyname&#125;&lt;\/b&gt;/); assert.match(h, /my &#123;note&#125; &lt;i&gt;/)
    assert.match(h, /\{companyname\}<\/strong>/) // only the company name of the footer is a merge field
})

test('Arabic is written right to left; a message without a link has no button', () => {
    assert.match(richMessage({ L: T.arabic, heading: 'x', card }), /dir="rtl"/)
    assert.doesNotMatch(richMessage({ L: T.english, heading: 'x', card }), /<a href/)
})
