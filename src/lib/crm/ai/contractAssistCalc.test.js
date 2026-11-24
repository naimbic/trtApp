import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContractPrompt, cleanContractAnswer, MERGE_FIELDS } from './contractAssistCalc.js'

test('the prompt lists every merge field and forbids the parts the contract adds itself', () => {
    const { system, user } = buildContractPrompt({ action: 'write', instruction: 'Yearly SEO retainer', language: 'French', type: 'Maintenance', company: 'Acme' })
    for (const k of Object.keys(MERGE_FIELDS)) assert.ok(system.includes(`{${k}}`), k)
    assert.match(system, /signature/)
    assert.match(system, /Write in French/)
    assert.match(user, /Yearly SEO retainer/)
    assert.match(user, /Maintenance/)
})

test('improve and translate carry the text; an unknown action is refused', () => {
    assert.match(buildContractPrompt({ action: 'improve', text: '<p>Hello {client_company}</p>' }).user, /\{client_company\}/)
    assert.match(buildContractPrompt({ action: 'translate', text: '<p>x</p>', language: 'Arabic' }).user, /into Arabic/)
    assert.throws(() => buildContractPrompt({ action: 'delete' }))
})

test('the answer is cleaned: no fence, no shell, no script, merge fields kept', () => {
    const out = cleanContractAnswer('```html\n<html><body><h1>1. Purpose</h1><p onclick="x()">For {client_company}</p><script>alert(1)</script></body></html>\n```')
    assert.equal(out, '<h2>1. Purpose</h2><p>For {client_company}</p>')
})

test('a markdown answer becomes headings, paragraphs and lists', () => {
    const out = cleanContractAnswer('## 1. Term\n\nFrom {contract_datestart} to **{contract_dateend}**.\n\n- one\n- two')
    assert.equal(out, '<h2>1. Term</h2><p>From {contract_datestart} to <strong>{contract_dateend}</strong>.</p><ul><li>one</li><li>two</li></ul>')
})
