import prisma from '@/lib/prisma'
import { requirePermission, hasCap, getStaffId } from '@/lib/crm/permissions'
import { seal, open } from './secret'
import { PROVIDERS, providerIds } from './providers'

const KEY = (p) => `ai_key_${p}`
const MODEL = (p) => `ai_model_${p}`
const WORKSPACE = (p) => `ai_workspace_${p}` // Anthropic keys that belong to no workspace need the workspace id on every request
const bad = (message, status = 400) => Object.assign(new Error(message), { status })

/** Only the super administrator may see or use anything about AI (keys, models, analyses). */
export async function requireSuper(cap = 'view') {
    const session = await requirePermission(null)
    if (!hasCap(session.user.authority || [], 'ai', cap)) throw bad('You are not allowed to use the AI tools', 403)
    return session
}

const read = async (names) => Object.fromEntries((await prisma.crmOption.findMany({ where: { name: { in: names } } })).map((r) => [r.name, r.value]))
const write = (name, value) => prisma.crmOption.upsert({ where: { name }, update: { value, autoload: false }, create: { name, value, autoload: false } })
export const audit = async (session, description) => { try { await prisma.crmActivityLog.create({ data: { description: description.slice(0, 400), staffId: await getStaffId(session) } }) } catch { /* auditing never breaks a request */ } }

/** The AI settings for the screen: which providers have a key (never the key itself), the models, the default. */
export async function getAiSettings() {
    await requireSuper()
    const names = ['ai_provider', 'ai_model', 'ai_system_prompt', 'ubersuggest_key', 'ubersuggest_url', 'ahrefs_key', ...providerIds.flatMap((p) => [KEY(p), MODEL(p), WORKSPACE(p)])]
    const o = await read(names)
    const opened = Object.fromEntries(providerIds.map((id) => [id, o[KEY(id)] ? open(o[KEY(id)]) : null]))
    const def = providerIds.includes(o.ai_provider) && opened[o.ai_provider] ? o.ai_provider : providerIds.find((id) => opened[id]) || ''
    const providers = providerIds.map((id) => {
        const plain = opened[id]
        // the default provider shows the default model, the others the model last chosen for them
        return { id, label: PROVIDERS[id].label, help: PROVIDERS[id].help, presets: PROVIDERS[id].presets, hasKey: !!plain, workspaceId: o[WORKSPACE(id)] || '', hint: plain ? `••••${plain.slice(-4)}` : null, unreadable: !!o[KEY(id)] && !plain, model: (id === def && o.ai_model) || o[MODEL(id)] || PROVIDERS[id].presets[0] }
    })
    const seoPlain = o.ubersuggest_key ? open(o.ubersuggest_key) : null
    const ahrefsPlain = o.ahrefs_key ? open(o.ahrefs_key) : null
    return { providers, provider: def, model: providers.find((p) => p.id === def)?.model || '', systemPrompt: o.ai_system_prompt || '', seo: { hasKey: !!seoPlain, hint: seoPlain ? `••••${seoPlain.slice(-4)}` : null, url: o.ubersuggest_url || '', ahrefs: { hasKey: !!ahrefsPlain, hint: ahrefsPlain ? `••••${ahrefsPlain.slice(-4)}` : null } } }
}

/** body: { keys: { id: 'new key' | null (remove) }, models: { id: 'model' }, provider, model, systemPrompt } */
export async function saveAiSettings(body = {}) {
    const session = await requireSuper('edit')
    const changed = []
    for (const [id, value] of Object.entries(body.keys || {})) {
        if (!providerIds.includes(id)) throw bad('Unknown AI provider')
        if (value === null) { await prisma.crmOption.deleteMany({ where: { name: KEY(id) } }); changed.push(`removed the ${PROVIDERS[id].label} key`); continue }
        const k = String(value || '').trim()
        if (!k) continue
        if (k.length < 8 || k.length > 400 || /\s/.test(k)) throw bad('That does not look like an API key')
        await write(KEY(id), seal(k)); changed.push(`set the ${PROVIDERS[id].label} key`)
    }
    for (const [id, m] of Object.entries(body.models || {})) {
        if (!providerIds.includes(id)) throw bad('Unknown AI provider')
        const model = String(m || '').trim().slice(0, 120)
        if (model) await write(MODEL(id), model)
    }
    for (const [id, w] of Object.entries(body.workspaces || {})) {
        if (!providerIds.includes(id)) throw bad('Unknown AI provider')
        const v = String(w || '').trim()
        if (v.length > 120 || /\s/.test(v)) throw bad('That does not look like a workspace id')
        if (v) await write(WORKSPACE(id), v); else await prisma.crmOption.deleteMany({ where: { name: WORKSPACE(id) } })
        changed.push(`${v ? 'set' : 'removed'} the ${PROVIDERS[id].label} workspace id`)
    }
    if (body.provider !== undefined) {
        if (body.provider && !providerIds.includes(body.provider)) throw bad('Unknown AI provider')
        await write('ai_provider', body.provider || ''); changed.push(`default provider ${body.provider || 'none'}`)
    }
    if (body.model !== undefined) await write('ai_model', String(body.model || '').trim().slice(0, 120))
    if (body.systemPrompt !== undefined) await write('ai_system_prompt', String(body.systemPrompt || '').slice(0, 4000))
    // the Ubersuggest key (SEO figures of a lead's website) and, if it ever changes, the address of its MCP server
    if (body.seoKey !== undefined) {
        const k = String(body.seoKey || '').trim()
        if (body.seoKey === null) { await prisma.crmOption.deleteMany({ where: { name: 'ubersuggest_key' } }); changed.push('removed the Ubersuggest key') } else if (k) {
            if (k.length < 8 || k.length > 600 || /\s/.test(k)) throw bad('That does not look like an API key')
            await write('ubersuggest_key', seal(k)); changed.push('set the Ubersuggest key')
        }
    }
    // the Ahrefs API key (checked first for the SEO figures; Ubersuggest is the fallback)
    if (body.ahrefsKey !== undefined) {
        const k = String(body.ahrefsKey || '').trim()
        if (body.ahrefsKey === null) { await prisma.crmOption.deleteMany({ where: { name: 'ahrefs_key' } }); changed.push('removed the Ahrefs key') } else if (k) {
            if (k.length < 8 || k.length > 600 || /\s/.test(k)) throw bad('That does not look like an API key')
            await write('ahrefs_key', seal(k)); changed.push('set the Ahrefs key')
        }
    }
    if (body.seoUrl !== undefined) {
        const u = String(body.seoUrl || '').trim()
        if (u && !/^https:\/\/[^\s]+$/i.test(u)) throw bad('The address must start with https://')
        if (u) await write('ubersuggest_url', u); else await prisma.crmOption.deleteMany({ where: { name: 'ubersuggest_url' } })
    }
    if (changed.length) await audit(session, `AI settings: ${changed.join(', ')}`)
    return getAiSettings()
}

/** The key + model to use: the ones asked for, else the defaults. */
export async function resolveAi({ provider, model } = {}) {
    const s = await getAiSettings()
    const id = provider || s.provider
    if (!providerIds.includes(id)) throw bad('Choose an AI provider and add its API key in Settings → AI first.')
    const raw = (await read([KEY(id)]))[KEY(id)]
    const apiKey = raw ? open(raw) : null
    if (!apiKey) throw bad(`Add the ${PROVIDERS[id].label} API key in Settings → AI first.`)
    const chosen = String(model || (id === s.provider ? s.model : '') || s.providers.find((p) => p.id === id)?.model || '').trim()
    return { provider: id, model: chosen, apiKey, workspaceId: s.providers.find((p) => p.id === id)?.workspaceId || '', systemPrompt: s.systemPrompt }
}


/** The key and model for a job that runs by itself (the Grow routine): no session, so no check of who asks. Returns null when no key is set. */
export async function resolveAiForJob() {
    const o = await read(['ai_provider', 'ai_model', 'ai_system_prompt', ...providerIds.flatMap((p) => [KEY(p), MODEL(p), WORKSPACE(p)])])
    const opened = Object.fromEntries(providerIds.map((id) => [id, o[KEY(id)] ? open(o[KEY(id)]) : null]))
    const id = providerIds.includes(o.ai_provider) && opened[o.ai_provider] ? o.ai_provider : providerIds.find((p) => opened[p])
    if (!id) return null
    const model = String((id === o.ai_provider ? o.ai_model : '') || o[MODEL(id)] || PROVIDERS[id].presets[0] || '').trim()
    if (!model) return null
    return { provider: id, model, apiKey: opened[id], workspaceId: o[WORKSPACE(id)] || '', systemPrompt: o.ai_system_prompt || '' }
}
