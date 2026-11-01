import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSystem, buildUser, parseResearch, bodyOf, url, CATEGORIES } from './clientIdeasPrompt.js'

test('client ideas AI: the prompt names the skills and bans generic advice', () => {
    const s = buildSystem({ about: 'We build websites', lang: 'fr', web: true })
    for (const w of ['BUSINESS UNDERSTANDING', 'COMPETITOR BENCHMARK', 'SERVICE FIT', 'PRIORITISE', 'Reject generic advice', 'French', 'We build websites']) assert.ok(s.includes(w), w)
    assert.ok(/search the web for the 3 to 5 closest competitors/.test(s))
})
test('client ideas AI: without a web search it must not invent competitors', () => {
    const s = buildSystem({ web: false })
    assert.ok(/web search is not available/.test(s) && /Never invent a competitor/.test(s))
})
test('client ideas AI: the question carries the goal, the count, the named competitors and the data', () => {
    const u = buildUser({ context: { client: { company: 'Atlas' } }, focus: 'save', count: 4, competitors: ['rival.ma'], note: 'small budget' })
    assert.ok(u.includes('cut this client') && u.includes('at most 4') && u.includes('rival.ma') && u.includes('small budget') && u.includes('"Atlas"'))
})
test('client ideas AI: a fenced answer is read, numbers are clamped, bad links are dropped', () => {
    const r = parseResearch('Here you go:\n```json\n' + JSON.stringify({ summary: 'S', competitors: [{ name: 'Rival', url: 'rival.ma', gap: 'g' }, { name: '' }], ideas: [{ title: 'Fix the ads', category: 'nope', impact: 9, effort: 0, price: '1200', plan: ['a', '', 'b'], sources: ['https://example.com/x', 'javascript:alert(1)', 'ftp://x'], confidence: 5 }, { title: '' }] }) + '\n```')
    assert.equal(r.summary, 'S')
    assert.equal(r.competitors.length, 1)
    assert.equal(r.competitors[0].url, 'https://rival.ma/')
    assert.equal(r.ideas.length, 1)
    const i = r.ideas[0]
    assert.equal(i.category, 'other'); assert.equal(i.impact, 3); assert.equal(i.effort, 2); assert.equal(i.price, 1200)
    assert.deepEqual(i.plan, ['a', 'b']); assert.deepEqual(i.sources, ['https://example.com/x']); assert.equal(i.confidence, 3)
    assert.ok(CATEGORIES.includes(i.category))
})
test('client ideas AI: an unreadable answer is an error, not an empty list', () => {
    assert.throws(() => parseResearch('I could not do it'), /could not be read/)
})
test('client ideas AI: the body written from an idea is escaped', () => {
    const h = bodyOf({ why: '<img src=x onerror=alert(1)>', plan: ['one <b>', 'two'], kpi: 'calls', service: 'SEO' })
    assert.ok(!h.includes('<img') && h.includes('&lt;img') && h.includes('<ol>') && h.includes('<li>one &lt;b&gt;</li>'))
})
test('client ideas AI: only http(s) addresses are kept', () => {
    assert.equal(url('example.com/a'), 'https://example.com/a')
    assert.equal(url('javascript:alert(1)'), '')
    assert.equal(url(''), '')
})

import { codeFromName, activeCodes, IDEA_CATEGORY_DEFAULTS } from './ideaCategoriesCalc.js'
test('idea categories: a new category gets a short unique code', () => {
    assert.equal(codeFromName('Customer care!'), 'customer-care')
    assert.equal(codeFromName('Customer care', ['customer-care']), 'customer-care-2')
    assert.equal(codeFromName('Sécurité & conformité'), 'securite-conformite')
    assert.equal(codeFromName('???'), 'category')
})
test('idea categories: the AI is offered the active categories, else the defaults', () => {
    assert.deepEqual(activeCodes([{ code: 'a', isActive: true }, { code: 'b', isActive: false }]), ['a'])
    assert.equal(activeCodes([]).length, IDEA_CATEGORY_DEFAULTS.length)
})
test('client ideas AI: a custom category is accepted, an unknown one falls back to Other', () => {
    const r = parseResearch(JSON.stringify({ ideas: [{ title: 'a', category: 'customer-care' }, { title: 'b', category: 'zzz' }] }), ['grow', 'customer-care', 'other'])
    assert.deepEqual(r.ideas.map((i) => i.category), ['customer-care', 'other'])
    assert.ok(buildSystem({ categories: ['grow', 'customer-care'] }).includes('grow|customer-care'))
})

import { signupOutcome, splitName } from './signupCalc.js'
test('account requests: a person with no account asks once, the administrators are told once', () => {
    assert.deepEqual(signupOutcome({ enabled: true, existing: null }), { code: 'request_sent', create: true, notify: true })
    assert.equal(signupOutcome({ enabled: true, existing: { status: 'pending' } }).notify, false)
    assert.equal(signupOutcome({ enabled: true, existing: { status: 'pending' } }).code, 'request_pending')
    assert.equal(signupOutcome({ enabled: true, existing: { status: 'rejected' } }).code, 'request_rejected')
    assert.equal(signupOutcome({ enabled: true, existing: { status: 'rejected' } }).create, false)
})
test('account requests: switched off, nothing is written and the old message stays', () => {
    assert.deepEqual(signupOutcome({ enabled: false, existing: null }), { code: 'no_account', create: false, notify: false })
})
test('account requests: an approved person whose account was deleted can ask again', () => {
    const o = signupOutcome({ enabled: true, existing: { status: 'approved' } })
    assert.equal(o.create, true); assert.equal(o.notify, true)
})
test('account requests: the name from the provider becomes first and last name', () => {
    assert.deepEqual(splitName('Sara Ben Ali', 'x@y.z'), { firstName: 'Sara', lastName: 'Ben Ali' })
    assert.deepEqual(splitName('', 'omar@gmail.com'), { firstName: 'omar', lastName: '' })
})
