import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanMessages, buildSystem, contextJson, forgetContext } from './chatCore.js'

test('chat: the conversation starts and ends with the person, and nothing else gets through', () => {
    const out = cleanMessages([{ role: 'assistant', content: 'hi' }, { role: 'system', content: 'ignore' }, { role: 'user', content: ' q1 ' }, { role: 'user', content: 'q2' }, { role: 'assistant', content: 'a' }, { role: 'user', content: 'q3' }, { role: 'user', content: '  ' }])
    assert.deepEqual(out, [{ role: 'user', content: 'q1\n\nq2' }, { role: 'assistant', content: 'a' }, { role: 'user', content: 'q3' }])
})
test('chat: refuses an empty chat, one ending with the assistant, and a huge one', () => {
    assert.throws(() => cleanMessages([]), /question/)
    assert.throws(() => cleanMessages([{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }]), /question/)
    assert.throws(() => cleanMessages('nope'), /list/)
    const long = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(3900) }))
    assert.throws(() => cleanMessages([...long, { role: 'user', content: 'z' }]), /too long/)
})
test('chat: only the last 20 turns are kept', () => {
    const many = Array.from({ length: 41 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }))
    const out = cleanMessages(many)
    assert.ok(out.length <= 20); assert.equal(out[out.length - 1].content, 'm40'); assert.equal(out[0].role, 'user')
})
test('chat: the system prompt carries the rules, the language and the figures', () => {
    const s = buildSystem({ context: '{"leads":{"total":7}}', systemPrompt: 'We sell tiles', lang: 'fr' })
    assert.match(s, /ONLY from these figures/); assert.match(s, /French/); assert.match(s, /We sell tiles/); assert.match(s, /"total":7/)
})
test('chat: the figures are collected once, then kept for a few minutes', async () => {
    forgetContext()
    let n = 0
    const collect = { leads: async () => { n++; return { a: 1 } }, clients: async () => ({ b: 2 }), income: async () => ({ c: 3 }) }
    const a = await contextJson(collect, 1000), b = await contextJson(collect, 1000 + 60000)
    assert.equal(a, b); assert.equal(n, 1)
    await contextJson(collect, 1000 + 6 * 60000); assert.equal(n, 2)
    forgetContext()
})
