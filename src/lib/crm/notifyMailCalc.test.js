import test from 'node:test'
import assert from 'node:assert/strict'
import { T, textsFor, when, richMessage, dotFor, levelOf, formatNotice, recordFromLink } from './notifyMailCalc.js'

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

test('the dot of a notice follows the level of the task, else its category', () => {
    assert.deepEqual([1, 2, 3, 4].map((p) => dotFor({ priority: p, kind: 'task' })), ['🟢', '🟡', '🟠', '🔴'])
    assert.equal(dotFor({ kind: 'reminder' }), '🟡'); assert.equal(dotFor({ kind: 'mention' }), '🔵'); assert.equal(dotFor({ kind: 'nothing' }), '⚪')
})

test('a priority written as a name becomes a level', () => {
    for (const [n, l] of [['Urgent', 4], ['Critical', 4], ['High', 3], ['Haute', 3], ['Medium', 2], ['Normal', 2], ['Low', 1], ['Basse', 1], ['3', 3], ['whatever', 0], ['', 0]]) assert.equal(levelOf(n), l, n)
})

test('a notice says its category first, then what happened, the title, the facts, the extract and the link', () => {
    const t = formatNotice({ L: T.english, kind: 'task', priority: 4, title: 'Prepare the offer', headline: 'Imane gave you a checklist step', rows: [['Status', 'In progress'], ['Due', '05 Nov 2026'], ['Empty', '']], note: 'call them  before\n3pm', link: 'https://crm.example/crm/tasks/1' })
    assert.equal(t, '🔴 TASK · Urgent\nImane gave you a checklist step\nPrepare the offer\nStatus: In progress\nDue: 05 Nov 2026\n“call them before 3pm”\nhttps://crm.example/crm/tasks/1')
    assert.match(formatNotice({ L: T.french, kind: 'reminder', title: 'Appeler Sara' }), /^🟡 RAPPEL\nAppeler Sara$/)
    assert.equal(formatNotice({ L: T.english, kind: 'lead', title: 'x', priorityLabel: 'Hot' }).split('\n')[0], '🟠 LEAD · Hot')
})

test('the record behind a link of the CRM', () => {
    assert.deepEqual(recordFromLink('/crm/tasks/6aeb34f16efdacd853569836?tab=x'), { relType: 'task', relId: '6aeb34f16efdacd853569836' })
    assert.equal(recordFromLink('/crm/clients/6aeb34f16efdacd853569836').relType, 'customer')
    assert.equal(recordFromLink('/crm/notes?note=1'), null)
})
