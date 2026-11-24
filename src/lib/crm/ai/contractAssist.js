import { requirePermission, hasCap, getStaffId } from '@/lib/crm/permissions'
import { readSettings } from '@/lib/crm/appSettings'
import { chat, PROVIDERS } from './providers'
import { resolveCore } from './aiSettings'
import { buildContractPrompt, cleanContractAnswer, CONTRACT_ACTIONS, LIMITS } from './contractAssistCalc'

/* "Write with AI" above a contract text (a contract or a contract template). Who may: whoever may write contracts (create or edit),
   when the feature is on in Settings, AI. */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const can = (session) => { const a = session.user.authority || []; return hasCap(a, 'contracts', 'create') || hasCap(a, 'contracts', 'edit') }
const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

// a person asks at most 20 times in 10 minutes: a contract is a long answer
const asks = new Map()
function limit(who) {
    const now = Date.now(), list = (asks.get(who) || []).filter((t) => now - t < 600000)
    if (list.length >= 20) throw fail('Too many requests in a short time. Wait a few minutes.', 429)
    list.push(now); asks.set(who, list)
}

export async function contractAssistStatus() {
    const session = await requirePermission('contracts', 'view')
    if (!can(session)) return { available: false, reason: 'rights' }
    const ai = await resolveCore('contracts')
    if (ai?.off) return { available: false, reason: 'off' }
    if (!ai) return { available: false, reason: 'key' }
    return { available: true, provider: PROVIDERS[ai.provider]?.label || ai.provider, model: ai.model }
}

/** body: { action: write | improve | translate, instruction, text (HTML), language, type } -> { html } */
export async function assistContract(body = {}) {
    const session = await requirePermission('contracts', 'view')
    if (!can(session)) throw fail('You are not allowed to write contracts with AI', 403)
    const action = String(body.action || 'write')
    if (!CONTRACT_ACTIONS.includes(action)) throw fail('Unknown action')
    const clip = (v, n) => String(v || '').slice(0, n)
    const text = clip(body.text, LIMITS.text).trim(), instruction = clip(body.instruction, LIMITS.instruction).trim()
    if (action !== 'write' && !plain(text)) throw fail('Write the text first, then ask the AI to work on it.')
    if (action === 'write' && !instruction && !plain(text)) throw fail('Tell the AI what the contract is about.')
    limit(String((await getStaffId(session)) || session.user.id))
    const ai = await resolveCore('contracts')
    if (ai?.off) throw fail('AI for contracts is switched off in Settings → AI.', 403)
    if (!ai) throw fail('Add an AI provider key in Settings → AI first.')
    const company = (await readSettings(['companyname'])).get('companyname')
    const { system, user } = buildContractPrompt({ action, instruction, text: plain(text) ? text : '', language: clip(body.language, 40), type: clip(body.type, 80), company, systemPrompt: ai.systemPrompt })
    const r = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: 6000, timeoutMs: 150000 })
    const html = cleanContractAnswer(r.text)
    if (!plain(html)) throw fail('The AI gave no text. Try again, or say more about the contract.', 502)
    return { html, action, provider: PROVIDERS[ai.provider]?.label || ai.provider, model: ai.model }
}
