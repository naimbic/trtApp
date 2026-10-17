import test from 'node:test'
import assert from 'node:assert/strict'
import { seal, open } from './secret.js'
import { PROVIDERS, buildChat, parseChat, friendlyError, chat, listModels, AIError } from './providers.js'

test('secret: a key survives sealing, differs each time, and is useless with another secret or when damaged', () => {
    const a = seal('sk-test-1234', 'secret-A'), b = seal('sk-test-1234', 'secret-A')
    assert.notEqual(a, b); assert.ok(!a.includes('sk-test'))
    assert.equal(open(a, 'secret-A'), 'sk-test-1234')
    assert.equal(open(a, 'secret-B'), null)
    assert.equal(open(a.slice(0, -3) + 'xyz', 'secret-A'), null)
    assert.equal(open('plain-text', 'secret-A'), null)
})

test('errors: a provider failure is reported with 424, never 502 or 504 (proxies replace those and hide the message)', async () => {
    const status = async (fn) => { try { await fn() } catch (e) { return e.status } }
    assert.equal(await status(() => chat({ provider: 'openai', apiKey: 'K', model: 'm', system: 'S', user: 'U', fetchFn: fakeFetch(500, {}) })), 424)
    assert.equal(await status(() => chat({ provider: 'openai', apiKey: 'K', model: 'm', system: 'S', user: 'U', fetchFn: fakeFetch(404, {}) })), 424)
    assert.equal(await status(() => chat({ provider: 'openai', apiKey: 'K', model: 'm', system: 'S', user: 'U', fetchFn: async () => { throw new Error('x') } })), 424)
    assert.equal(await status(() => chat({ provider: 'openai', apiKey: 'K', model: 'm', system: 'S', user: 'U', fetchFn: fakeFetch(401, {}) })), 400)
})
test('providers: the four the CRM offers, each with models to choose from', () => {
    assert.deepEqual(Object.keys(PROVIDERS), ['anthropic', 'openai', 'deepseek', 'openrouter'])
    for (const p of Object.values(PROVIDERS)) assert.ok(p.presets.length >= 2)
})
test('request: Claude uses the Messages API with x-api-key and a system field', () => {
    const r = buildChat('anthropic', { model: 'claude-sonnet-5-5', system: 'S', user: 'U', maxTokens: 500 }, 'KEY')
    assert.equal(r.url, 'https://api.anthropic.com/v1/messages')
    assert.equal(r.headers['x-api-key'], 'KEY'); assert.ok(r.headers['anthropic-version'])
    assert.deepEqual(r.body, { model: 'claude-sonnet-5-5', max_tokens: 500, system: 'S', messages: [{ role: 'user', content: 'U' }] })
})
test('request: ChatGPT, DeepSeek and OpenRouter use chat completions with a bearer key', () => {
    const o = buildChat('openai', { model: 'gpt-4o', system: 'S', user: 'U' }, 'K')
    assert.equal(o.url, 'https://api.openai.com/v1/chat/completions'); assert.equal(o.headers.authorization, 'Bearer K')
    assert.deepEqual(o.body.messages, [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }]); assert.ok('max_tokens' in o.body)
    assert.equal(buildChat('deepseek', { model: 'deepseek-chat', system: 'S', user: 'U' }, 'K').url, 'https://api.deepseek.com/chat/completions')
    assert.equal(buildChat('openrouter', { model: 'openai/gpt-4o', system: 'S', user: 'U' }, 'K').url, 'https://openrouter.ai/api/v1/chat/completions')
})
test('request: OpenAI reasoning models take max_completion_tokens', () => {
    assert.ok('max_completion_tokens' in buildChat('openai', { model: 'o4-mini', system: 'S', user: 'U' }, 'K').body)
    assert.ok(!('max_tokens' in buildChat('openai', { model: 'o4-mini', system: 'S', user: 'U' }, 'K').body))
    assert.ok('max_tokens' in buildChat('deepseek', { model: 'deepseek-reasoner', system: 'S', user: 'U' }, 'K').body)
})
test('answer: text and tokens are read from both API shapes; an empty answer is an error', () => {
    assert.deepEqual(parseChat('anthropic', { content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'world' }], usage: { input_tokens: 5, output_tokens: 7 } }), { text: 'Hello world', usage: { input: 5, output: 7 } })
    assert.deepEqual(parseChat('openai', { choices: [{ message: { content: ' Hi ' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }), { text: 'Hi', usage: { input: 3, output: 2 } })
    assert.throws(() => parseChat('openai', { choices: [{ message: { content: '' } }] }), AIError)
})
test('errors: a refused key, no credit, a wrong model and a rate limit each get a clear message without the key', () => {
    assert.match(friendlyError('openai', 401, {}), /refused the API key/)
    assert.match(friendlyError('deepseek', 402, {}), /no credit/)
    assert.match(friendlyError('anthropic', 404, { error: { message: 'model: nope' } }), /does not know this model/)
    assert.match(friendlyError('openrouter', 429, {}), /limiting requests/)
    assert.doesNotMatch(friendlyError('openai', 401, { error: { message: 'Incorrect API key provided: sk-secret' } }), /sk-secret/)
})
const fakeFetch = (status, json, seen) => async (url, init) => { seen?.push({ url, init }); return { ok: status < 400, status, json: async () => json } }
test('chat: sends the request, returns the text, and turns a provider refusal into a friendly error', async () => {
    const seen = []
    const out = await chat({ provider: 'openai', apiKey: 'K', model: 'gpt-4o', system: 'S', user: 'U', fetchFn: fakeFetch(200, { choices: [{ message: { content: 'ok' } }] }, seen) })
    assert.equal(out.text, 'ok'); assert.equal(seen[0].url, 'https://api.openai.com/v1/chat/completions')
    await assert.rejects(chat({ provider: 'openai', apiKey: 'K', model: 'gpt-4o', system: 'S', user: 'U', fetchFn: fakeFetch(401, { error: { message: 'bad key sk-x' } }) }), (e) => e.status === 400 && /refused the API key/.test(e.message) && !/sk-x/.test(e.message))
    await assert.rejects(chat({ provider: 'openai', apiKey: '', model: 'gpt-4o', system: 'S', user: 'U' }), /No API key/)
    await assert.rejects(chat({ provider: 'openai', apiKey: 'K', model: '', system: 'S', user: 'U' }), /Choose a model/)
})
test('chat: a network failure and a slow provider are reported, not thrown raw', async () => {
    await assert.rejects(chat({ provider: 'deepseek', apiKey: 'K', model: 'm', system: 'S', user: 'U', fetchFn: async () => { throw new Error('ECONNREFUSED') } }), /Could not reach DeepSeek/)
    await assert.rejects(chat({ provider: 'deepseek', apiKey: 'K', model: 'm', system: 'S', user: 'U', timeoutMs: 20, fetchFn: (u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))) }), /took too long/)
})
test('models: ids are listed per provider, without embedding or audio models, sorted and unique', async () => {
    const seen = []
    const ids = await listModels({ provider: 'openai', apiKey: 'K', fetchFn: fakeFetch(200, { data: [{ id: 'gpt-4o' }, { id: 'text-embedding-3-small' }, { id: 'whisper-1' }, { id: 'gpt-4o-mini' }, { id: 'gpt-4o' }] }, seen) })
    assert.deepEqual(ids, ['gpt-4o', 'gpt-4o-mini']); assert.equal(seen[0].url, 'https://api.openai.com/v1/models')
    const c = await listModels({ provider: 'anthropic', apiKey: 'K', fetchFn: fakeFetch(200, { data: [{ id: 'claude-b' }, { id: 'claude-a' }] }, seen) })
    assert.deepEqual(c, ['claude-a', 'claude-b']); assert.match(seen[1].url, /anthropic\.com\/v1\/models/); assert.equal(seen[1].init.headers['x-api-key'], 'K')
    await assert.rejects(listModels({ provider: 'openrouter', apiKey: '' }), /No API key/)
})
