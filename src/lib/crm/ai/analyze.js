import { rateLimit } from '@/lib/rateLimit'
import { COLLECT } from './aiData'
import { chat, listModels, PROVIDERS, providerIds } from './providers'
import { requireSuper, resolveAi, audit } from './aiSettings'

const LANGS = { en: 'English', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' }
const bad = (message, status = 400) => Object.assign(new Error(message), { status })

const BASE = `You are a careful business analyst inside a small company's CRM. You are given figures computed by the CRM as JSON.
Rules: use ONLY these figures; never invent or estimate numbers that are not in them; quote the exact figures you rely on; if something needed is missing, say so.
Amounts are in the currency named in the data and are never converted between currencies.
Write short, plain, structured Markdown with these sections: "## Summary" (3 to 5 sentences), "## Key numbers" (a short list), "## What stands out" (good and bad), "## Risks", "## Recommended actions" (at most 5, concrete, the most valuable first).
Be direct and specific to this company; no generic advice, no filler, no apologies.`

const TASKS = {
    leads: 'Analyse the sales leads: how many there are and where they are, which sources and people convert best or worst, the trend over the last 12 months, how long conversion takes, and which leads need attention now (never contacted, silent for a month, old, without an owner).',
    clients: 'Analyse the clients: how many are active, who brings the revenue and how concentrated it is, who owes money (overdue and outstanding), dormant clients who used to buy, clients never invoiced, and how fast the client base has grown by year.',
    income: 'Analyse the income over the whole life of the company, year by year: invoiced and collected amounts, expenses, growth or decline each year, the best months, how this year to date compares with the same period last year, the gap between invoiced and collected, and the outlook.',
}

/** Free-form question: allowed only about the same figures. */
const askLine = (q) => (q ? `\nThe owner also asks (answer it inside the same structure, from these figures only): ${String(q).slice(0, 600)}` : '')

export function buildPrompt({ kind, data, question, systemPrompt, lang = 'en' }) {
    if (!TASKS[kind]) throw bad('Unknown analysis')
    const json = JSON.stringify(data)
    if (json.length > 60000) throw bad('There is too much data to send in one go.')
    const company = systemPrompt ? `\nAbout this company (written by its owner): ${String(systemPrompt).slice(0, 1500)}` : ''
    return {
        system: `${BASE}${company}\nAnswer in ${LANGS[lang] || 'English'}.`,
        user: `${TASKS[kind]}${askLine(question)}\n\nFigures (JSON):\n${json}`,
    }
}

/** Runs one analysis with the chosen (or default) provider and model. Super administrator only. */
export async function analyze({ kind, question, provider, model, lang }) {
    const session = await requireSuper()
    if (!COLLECT[kind]) throw bad('Unknown analysis')
    rateLimit(`ai:${session.user.id}`, 30, 3600000) // a person cannot burn the account's credit by accident
    const ai = await resolveAi({ provider, model })
    const data = await COLLECT[kind]()
    const { system, user } = buildPrompt({ kind, data, question, systemPrompt: ai.systemPrompt, lang })
    const t = Date.now()
    const out = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: 2200 })
    await audit(session, `AI analysis (${kind}) with ${PROVIDERS[ai.provider].label} · ${ai.model}`)
    return { kind, markdown: out.text, provider: ai.provider, model: ai.model, usage: out.usage, ms: Date.now() - t, generatedAt: new Date().toISOString() }
}

/** The figures alone (for the charts), no AI involved. */
export async function figures(kind) {
    await requireSuper()
    if (!COLLECT[kind]) throw bad('Unknown analysis')
    return COLLECT[kind]()
}

export async function modelsFor(provider) {
    await requireSuper()
    if (!providerIds.includes(provider)) throw bad('Unknown AI provider')
    const ai = await resolveAi({ provider })
    return { models: await listModels({ provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId }) }
}

/** A tiny question to see that the key and the model work. */
export async function testConnection({ provider, model }) {
    const session = await requireSuper()
    rateLimit(`ai-test:${session.user.id}`, 20, 600000)
    const ai = await resolveAi({ provider, model })
    const t = Date.now()
    const out = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system: 'Reply with the single word: ready', user: 'ping', maxTokens: 20 })
    return { ok: true, provider: ai.provider, model: ai.model, reply: out.text.slice(0, 40), ms: Date.now() - t }
}
