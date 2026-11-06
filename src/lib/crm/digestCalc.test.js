import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDigest } from './digestCalc.js'

test('nothing to tell means no email', () => {
    assert.equal(buildDigest({ sections: { news: [], tasks: [] } }).empty, true)
})
test('the email lists each section with its count and links', () => {
    const r = buildDigest({ name: 'Sara', company: 'TRT', base: 'https://crm.example', sections: { news: [{ text: 'Naim mentioned you', sub: 'Quote', link: '/crm/notes' }], tasks: [{ text: 'Send invoice' }, { text: 'Call Atlas' }] } })
    assert.equal(r.empty, false)
    assert.match(r.subject, /Your day · TRT/)
    assert.match(r.html, /Good morning Sara/)
    assert.match(r.html, /New for you <span[^>]*>\(1\)/)
    assert.match(r.html, /Tasks due or late <span[^>]*>\(2\)/)
    assert.match(r.html, /href="https:\/\/crm\.example\/crm\/notes"/)
    assert.doesNotMatch(r.html, /Reminders today/) // an empty section is left out
})
test('a long list is cut with "and N more", text is escaped, Arabic goes right to left', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ text: `<b>${i}</b>` }))
    const r = buildDigest({ language: 'arabic', sections: { tasks: many } })
    assert.match(r.html, /dir="rtl"/)
    assert.match(r.html, /و4 أخرى/)
    assert.doesNotMatch(r.html, /<b>0<\/b>/)
})
