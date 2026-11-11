import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEmailPrompt, cleanAnswer, needsText, EMAIL_ACTIONS } from './emailAssistCalc.js'

test('every action builds a prompt; an unknown one is refused', () => {
    for (const a of EMAIL_ACTIONS) {
        const p = buildEmailPrompt({ action: a, instruction: 'say hi', text: 'Hello there', language: 'French', company: 'TRT' })
        assert.ok(p.system.includes('TRT') && p.user.length > 10)
    }
    assert.throws(() => buildEmailPrompt({ action: 'hack' }), /Unknown action/)
})

test('the rules forbid a signature and invented facts; the company instructions are added', () => {
    const p = buildEmailPrompt({ action: 'write', instruction: 'offer a call', instructions: 'Always tutoie the client', systemPrompt: 'Be brief' })
    assert.match(p.system, /signature/i); assert.match(p.system, /Never invent/)
    assert.match(p.system, /tutoie/); assert.match(p.system, /Be brief/)
})

test('language and context reach the prompt', () => {
    const p = buildEmailPrompt({ action: 'reply', language: 'Spanish', context: 'Lead: Ana, last mail: price?' })
    assert.match(p.system, /Write in Spanish/); assert.match(p.user, /Ana/)
})

test('the answer is cleaned and becomes paragraphs; html is escaped', () => {
    const r = cleanAnswer('```\nSubject: Hi\n\nHello **Ana**,\n\nSee <b>this</b> & that.\nBye\n```')
    assert.ok(!r.text.includes('Subject') && !r.text.includes('**'))
    assert.equal(r.html, '<p>Hello Ana,</p><p>See &lt;b&gt;this&lt;/b&gt; &amp; that.<br>Bye</p>')
})

test('a subject answer is one clean line', () => {
    assert.equal(cleanAnswer('Subject: "Your offer"\nextra', { subject: true }).text, 'Your offer')
})

test('which actions need a text', () => {
    assert.ok(needsText('improve') && needsText('fix') && !needsText('write') && !needsText('reply'))
})
