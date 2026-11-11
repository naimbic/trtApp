import { requirePermission, hasCap, getStaffId } from '@/lib/crm/permissions'
import { readSettings } from '@/lib/crm/appSettings'
import { chat, PROVIDERS } from './providers'
import { resolveCore } from './aiSettings'
import { buildEmailPrompt, cleanAnswer, needsText, LIMITS, EMAIL_ACTIONS } from './emailAssistCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const can = (session) => hasCap(session.user.authority || [], 'ai_email', 'use')

// a person asks at most 40 times in 10 minutes (a runaway click or a script must not burn the credit)
const asks = new Map()
function limit(who) {
    const now = Date.now(), list = (asks.get(who) || []).filter((t) => now - t < 600000)
    if (list.length >= 40) throw fail('Too many requests in a short time. Wait a few minutes.', 429)
    list.push(now); asks.set(who, list)
}

/** Is the assistant available to this person, and with which AI (for the button)? */
export async function emailAssistStatus() {
    const session = await requirePermission(null)
    if (!can(session)) return { available: false, reason: 'rights' }
    const ai = await resolveCore('email')
    if (ai?.off) return { available: false, reason: 'off' }
    if (!ai) return { available: false, reason: 'key' }
    return { available: true, provider: PROVIDERS[ai.provider]?.label || ai.provider, model: ai.model }
}

/** body: { action, instruction, text, tone, language, context } -> { text, html, subject? } */
export async function assistEmail(body = {}) {
    const session = await requirePermission(null)
    if (!can(session)) throw fail('You are not allowed to use the AI email assistant', 403)
    const action = String(body.action || '')
    if (!EMAIL_ACTIONS.includes(action)) throw fail('Unknown action')
    const clip = (v, n) => String(v || '').slice(0, n)
    const text = clip(body.text, LIMITS.text).trim(), instruction = clip(body.instruction, LIMITS.instruction).trim()
    if (needsText(action) && !text && !(action === 'subject' && instruction)) throw fail('Write the email first, then ask the AI to work on it.')
    if (action === 'write' && !instruction && !text) throw fail('Tell the AI what the email must say.')
    limit(String((await getStaffId(session)) || session.user.id))
    const ai = await resolveCore('email')
    if (ai?.off) throw fail('The AI email assistant is switched off in Settings → AI.', 403)
    if (!ai) throw fail('Add an AI provider key in Settings → AI first.')
    const company = (await readSettings(['companyname'])).get('companyname')
    const { system, user } = buildEmailPrompt({ action, instruction, text, tone: body.tone, language: clip(body.language, 40), context: clip(body.context, LIMITS.context), company, instructions: ai.instructions, systemPrompt: ai.systemPrompt })
    const r = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: action === 'subject' ? 80 : 1800 })
    const out = cleanAnswer(r.text, { subject: action === 'subject' })
    return { ...out, action, provider: PROVIDERS[ai.provider]?.label || ai.provider, model: ai.model }
}
