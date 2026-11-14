import crypto from 'node:crypto'
import prisma from '@/lib/prisma'
import { chat } from '@/lib/crm/ai/providers'
import { resolveAiForJob } from '@/lib/crm/ai/aiSettings'
import { detectLanguage } from '@/lib/crm/detectLanguage'

/* The client note and the terms a new estimate or invoice starts with (Settings → the predefined texts), in the language of the client.
   The texts are written once in the settings, in one language. For a client with another language they are translated by the AI of
   the company (Settings → AI) and the translation is kept, so it is asked only once per language until the text changes.
   Without an AI key, or when the translation fails, the text is returned as written. */
const KINDS = { invoice: 'invoice', estimate: 'estimate' }
const LANGS = ['english', 'french', 'spanish', 'german', 'italian', 'portuguese', 'dutch', 'turkish', 'russian', 'arabic', 'japanese']
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex')

async function inLanguage(kind, field, text, language) {
    const src = String(text || '').trim()
    if (!src || !LANGS.includes(language) || detectLanguage(src) === language) return text || ''
    const name = `note_tr_${kind}_${field}_${language}`
    const kept = await prisma.crmOption.findUnique({ where: { name } })
    try { const k = JSON.parse(kept?.value || 'null'); if (k?.src === hash(src) && k.text) return k.text } catch { /* asked again */ }
    const ai = await resolveAiForJob() // the company's default AI provider and model.catch(() => null)
    if (!ai) return text
    try {
        const r = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, maxTokens: 3000, timeoutMs: 45000,
            system: `You translate the standard notes printed on business documents (estimates, invoices). Translate the text into ${language}, formal business tone. Keep the line breaks, the numbers, the names, any HTML tags and any placeholder in curly braces exactly as they are. Answer with the translation only.`,
            user: src })
        const out = String(r.text || '').trim()
        if (!out) return text
        const value = JSON.stringify({ src: hash(src), text: out })
        await prisma.crmOption.upsert({ where: { name }, update: { value }, create: { name, value, autoload: false } })
        return out
    } catch { return text }
}

/** { clientNote, terms } for a new document of this kind and this client, with `base` (the texts as written in the settings). */
export async function notesForClient(kind, clientId) {
    const k = KINDS[kind]
    if (!k) return { clientNote: '', terms: '', base: { clientNote: '', terms: '' }, language: '' }
    const rows = await prisma.crmOption.findMany({ where: { name: { in: [`predefined_clientnote_${k}`, `predefined_terms_${k}`] } } })
    const o = Object.fromEntries(rows.map((r) => [r.name, r.value || '']))
    const base = { clientNote: o[`predefined_clientnote_${k}`] || '', terms: o[`predefined_terms_${k}`] || '' }
    const client = /^[0-9a-f]{24}$/i.test(clientId || '') ? await prisma.crmClient.findUnique({ where: { id: clientId }, select: { defaultLanguage: true } }) : null
    const language = String(client?.defaultLanguage || '').toLowerCase()
    if (!language) return { ...base, base, language: '' }
    const [clientNote, terms] = await Promise.all([inLanguage(k, 'clientnote', base.clientNote, language), inLanguage(k, 'terms', base.terms, language)])
    return { clientNote, terms, base, language }
}
