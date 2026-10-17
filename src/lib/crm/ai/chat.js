import { rateLimit } from '@/lib/rateLimit'
import { COLLECT } from './aiData'
import { chat, PROVIDERS } from './providers'
import { requireSuper, resolveAi, audit } from './aiSettings'
import { bad, cleanMessages, buildSystem, contextJson } from './chatCore'

/** One reply in a conversation about the company's figures. Super administrator only. */
export async function reply({ messages, provider, model, lang }) {
    const session = await requireSuper()
    const turns = cleanMessages(messages)
    rateLimit(`ai-chat:${session.user.id}`, 60, 3600000)
    const ai = await resolveAi({ provider, model })
    const context = await contextJson(COLLECT)
    if (context.length > 70000) throw bad('There is too much data to send in one go.')
    const t = Date.now()
    const out = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system: buildSystem({ context, systemPrompt: ai.systemPrompt, lang }), messages: turns, maxTokens: 1800 })
    await audit(session, `AI chat with ${PROVIDERS[ai.provider].label} · ${ai.model}`)
    return { text: out.text, provider: ai.provider, model: ai.model, usage: out.usage, ms: Date.now() - t }
}
