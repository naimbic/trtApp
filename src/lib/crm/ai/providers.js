// The AI providers the CRM can talk to. Claude speaks its own Messages API; ChatGPT, DeepSeek and OpenRouter speak the
// OpenAI "chat completions" API, so one adapter serves three of them. Everything here is free of the database and the
// framework (fetch can be handed in), so it can be tested.
export const PROVIDERS = {
    anthropic: { id: 'anthropic', label: 'Claude (Anthropic)', kind: 'anthropic', base: 'https://api.anthropic.com/v1', help: 'console.anthropic.com → API keys', presets: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'] },
    openai: { id: 'openai', label: 'ChatGPT (OpenAI)', kind: 'openai', base: 'https://api.openai.com/v1', help: 'platform.openai.com → API keys', presets: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini', 'o4-mini'] },
    deepseek: { id: 'deepseek', label: 'DeepSeek', kind: 'openai', base: 'https://api.deepseek.com', help: 'platform.deepseek.com → API keys', presets: ['deepseek-chat', 'deepseek-reasoner'] },
    openrouter: { id: 'openrouter', label: 'OpenRouter', kind: 'openai', base: 'https://openrouter.ai/api/v1', help: 'openrouter.ai → Keys (one key, hundreds of models)', presets: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4o', 'google/gemini-2.5-pro', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'] },
}
export const providerIds = Object.keys(PROVIDERS)

/** The address of a provider; AI_BASE_URL_<PROVIDER> (e.g. AI_BASE_URL_OPENAI) points it at a proxy or a self-hosted compatible server. */
export const baseOf = (id, env = process.env) => String(env[`AI_BASE_URL_${String(id).toUpperCase()}`] || PROVIDERS[id].base).replace(/\/+$/, '')

export class AIError extends Error {
    // 424 (the provider failed) rather than 502 / 504: a proxy or CDN in front of the app replaces those with its own page and the message is lost
    constructor(message, status = 424) { super(message); this.status = status }
}

/** The request for one question: { url, headers, body }. */
export function buildChat(providerId, { model, system, user, messages, maxTokens = 2000, workspaceId }, apiKey) {
    // a conversation ([{ role, content }]) or one question
    const turns = messages?.length ? messages : [{ role: 'user', content: user }]
    const p = PROVIDERS[providerId]
    if (!p) throw new AIError('Unknown AI provider', 400)
    if (p.kind === 'anthropic') {
        return { url: `${baseOf(providerId)}/messages`, headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}) }, body: { model, max_tokens: maxTokens, system, messages: turns } }
    }
    // OpenAI's reasoning models take max_completion_tokens; the others (and DeepSeek, OpenRouter) max_tokens
    const tokens = providerId === 'openai' && /^(o\d|gpt-5)/.test(model) ? 'max_completion_tokens' : 'max_tokens'
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }
    if (providerId === 'openrouter') { headers['X-Title'] = 'trtCRM' }
    return { url: `${baseOf(providerId)}/chat/completions`, headers, body: { model, messages: [{ role: 'system', content: system }, ...turns], [tokens]: maxTokens } }
}

/** The answer text and the tokens used. */
export function parseChat(providerId, json) {
    const p = PROVIDERS[providerId]
    const text = p.kind === 'anthropic'
        ? (json?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
        : json?.choices?.[0]?.message?.content || ''
    if (!String(text).trim()) throw new AIError('The model answered with nothing. Try again or choose another model.')
    const u = json?.usage || {}
    return { text: String(text).trim(), usage: { input: u.input_tokens ?? u.prompt_tokens ?? null, output: u.output_tokens ?? u.completion_tokens ?? null } }
}

/** What the person is told when a provider refuses (never contains the key). */
export function friendlyError(providerId, status, body) {
    const p = PROVIDERS[providerId]
    const detail = String(body?.error?.message || body?.error || body?.message || '').slice(0, 500)
    if (status === 401 || status === 403) return `${p.label} refused the API key. Check it, or create a new one.`
    if (status === 402) return `${p.label} says the account has no credit left.`
    if (status === 404) return `${p.label} does not know this model${detail ? ` (${detail})` : ''}. Pick another model.`
    if (status === 429) return `${p.label} is limiting requests or the quota is used up. Try again in a moment.`
    if (status === 400) return `${p.label} rejected the request${detail ? `: ${detail}` : ''}.`
    return `${p.label} is not answering (${status})${detail ? `: ${detail}` : ''}. Try again later.`
}

const withTimeout = (ms) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) } }

async function call(providerId, url, init, fetchFn, timeoutMs) {
    const t = withTimeout(timeoutMs)
    let res
    try { res = await fetchFn(url, { ...init, signal: t.signal }) } catch (e) { throw new AIError(e?.name === 'AbortError' ? `${PROVIDERS[providerId].label} took too long to answer.` : `Could not reach ${PROVIDERS[providerId].label}.`) } finally { t.done() }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new AIError(friendlyError(providerId, res.status, json), res.status === 401 || res.status === 403 ? 400 : 424)
    return json
}

/** Asks one question. Returns { text, usage }. */
export async function chat({ provider, apiKey, workspaceId, model, system, user, messages, maxTokens, fetchFn = fetch, timeoutMs = 90000 }) {
    if (!apiKey) throw new AIError(`No API key for ${PROVIDERS[provider]?.label || provider} yet.`, 400)
    if (!model) throw new AIError('Choose a model first.', 400)
    const r = buildChat(provider, { model, system, user, messages, maxTokens, workspaceId }, apiKey)
    return parseChat(provider, await call(provider, r.url, { method: 'POST', headers: r.headers, body: JSON.stringify(r.body) }, fetchFn, timeoutMs))
}

const NOT_CHAT = /embed|whisper|tts|dall-e|moderation|transcribe|audio|image|realtime|search-preview/i

/** The models the key can use (for the dropdown). */
export async function listModels({ provider, apiKey, workspaceId, fetchFn = fetch, timeoutMs = 20000 }) {
    const p = PROVIDERS[provider]
    if (!p) throw new AIError('Unknown AI provider', 400)
    if (!apiKey) throw new AIError(`No API key for ${p.label} yet.`, 400)
    const headers = p.kind === 'anthropic' ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}) } : { authorization: `Bearer ${apiKey}` }
    const url = p.kind === 'anthropic' ? `${baseOf(provider)}/models?limit=100` : `${baseOf(provider)}/models`
    const json = await call(provider, url, { method: 'GET', headers }, fetchFn, timeoutMs)
    const ids = (json?.data || []).map((m) => m.id).filter((id) => typeof id === 'string' && !NOT_CHAT.test(id))
    return [...new Set(ids)].sort((a, b) => a.localeCompare(b)).slice(0, 400)
}
