// The pure parts of the AI chat (no database, no framework), so they can be tested.
const LANGS = { en: 'English', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' }
export const bad = (message, status = 400) => Object.assign(new Error(message), { status })

const RULES = `You are the assistant of a small company's owner, inside its CRM. You are given figures computed by the CRM (leads, clients, yearly income) as JSON.
Rules: answer ONLY from these figures; never invent or estimate numbers that are not in them; when you quote a number, take it exactly from the data; if the data cannot answer, say so and name what is missing.
Amounts are in the currency named in the data and are never converted between currencies.
You can also help with general business questions (wording a follow-up, a plan, a short email) but never claim facts about this company that the figures do not show.
Be direct, short and specific. Use plain Markdown (short lists, a small table when comparing). No filler, no apologies.`

// the figures change slowly and cost several queries, so they are kept for a few minutes
let cache = { at: 0, json: '' }
const TTL = 5 * 60 * 1000
export async function contextJson(collect, now = Date.now()) {
    if (cache.json && now - cache.at < TTL) return cache.json
    const [leads, clients, income] = await Promise.all([collect.leads(), collect.clients(), collect.income()])
    const json = JSON.stringify({ today: new Date(now).toISOString().slice(0, 10), leads, clients, income })
    cache = { at: now, json }
    return json
}
export const forgetContext = () => { cache = { at: 0, json: '' } }

/** The conversation as the provider needs it: only user/assistant turns with text, starting and ending with the user's. */
export function cleanMessages(input) {
    if (!Array.isArray(input)) throw bad('Send the conversation as a list of messages.')
    let msgs = input
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }))
        .slice(-20)
    while (msgs.length && msgs[0].role !== 'user') msgs.shift()
    const merged = [] // two turns in a row of the same person become one (Claude refuses otherwise)
    for (const m of msgs) { const last = merged[merged.length - 1]; if (last && last.role === m.role) last.content += `\n\n${m.content}`; else merged.push({ ...m }) }
    if (!merged.length || merged[merged.length - 1].role !== 'user') throw bad('Write a question first.')
    if (merged.reduce((a, m) => a + m.content.length, 0) > 24000) throw bad('This conversation is too long. Start a new one.')
    return merged
}

export function buildSystem({ context, systemPrompt, lang = 'en' }) {
    const company = systemPrompt ? `\nAbout this company (written by its owner): ${String(systemPrompt).slice(0, 1500)}` : ''
    return `${RULES}${company}\nAnswer in ${LANGS[lang] || 'English'} unless the owner writes in another language.\n\nFigures (JSON):\n${context}`
}

