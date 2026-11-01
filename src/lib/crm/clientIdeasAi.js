import prisma from '@/lib/prisma'
import { requirePermission, getStaffId } from '@/lib/crm/permissions'
import { scope as clientScope } from '@/lib/crm/clientsApi'
import { rateLimit } from '@/lib/rateLimit'
import { chat, PROVIDERS } from '@/lib/crm/ai/providers'
import { resolveAi, audit } from '@/lib/crm/ai/aiSettings'
import { storeRich } from '@/lib/crm/richText'
import { CATEGORIES, LANGS, FOCUS, PROJECT, PROPOSAL, url, buildSystem, buildUser, parseResearch, bodyOf } from '@/lib/crm/clientIdeasPrompt'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
/** What the AI is told about the client: company level facts only. Never a contact name, email or phone number. */
export async function gatherContext(client) {
    const clientId = client.id
    const since = new Date(Date.now() - 365 * 86400000)
    const [invoices, projects, tickets, proposals, ideas, items] = await Promise.all([
        prisma.crmInvoice.findMany({ where: { clientId, status: { notIn: [5, 6, 7] } }, select: { id: true, total: true, date: true, currencyId: true }, take: 2000 }),
        prisma.crmProject.findMany({ where: { clientId }, select: { name: true, status: true }, orderBy: { createdAt: 'desc' }, take: 15 }),
        prisma.crmTicket.findMany({ where: { clientId }, select: { subject: true }, orderBy: { createdAt: 'desc' }, take: 15 }),
        prisma.crmProposal.findMany({ where: { relType: 'customer', relId: clientId }, select: { subject: true, status: true }, orderBy: { date: 'desc' }, take: 10 }),
        prisma.crmClientIdea.findMany({ where: { clientId }, select: { title: true, status: true }, orderBy: { createdAt: 'desc' }, take: 40 }),
        prisma.crmItem.findMany({ select: { description: true, rate: true }, orderBy: { description: 'asc' }, take: 60 }),
    ])
    const lines = invoices.length ? await prisma.crmItemable.findMany({ where: { relType: 'invoice', relId: { in: invoices.map((i) => i.id) } }, select: { description: true, qty: true, rate: true }, take: 3000 }) : []
    const bought = {}
    for (const l of lines) { const k = String(l.description || '').trim().slice(0, 80); if (!k) continue; const b = (bought[k] ||= { times: 0, amount: 0 }); b.times++; b.amount += (l.qty || 0) * (l.rate || 0) }
    const cur = Object.fromEntries((await prisma.crmCurrency.findMany({ select: { id: true, name: true } })).map((c) => [c.id, c.name]))
    const money = {}
    for (const i of invoices) { const c = cur[i.currencyId] || 'default'; const m = (money[c] ||= { lifetime: 0, last12Months: 0, invoices: 0 }); m.lifetime += i.total || 0; m.invoices++; if (i.date && +new Date(i.date) >= +since) m.last12Months += i.total || 0 }
    for (const m of Object.values(money)) { m.lifetime = Math.round(m.lifetime); m.last12Months = Math.round(m.last12Months) }
    const o = Object.fromEntries((await prisma.crmOption.findMany({ where: { name: { in: ['companyname'] } } })).map((x) => [x.name, x.value]))
    return {
        us: o.companyname || '',
        client: { company: client.company || '', website: url(client.website), industry: client.industry || '', city: client.city || '', customerSince: client.createdAt ? new Date(client.createdAt).toISOString().slice(0, 10) : '', language: client.defaultLanguage || '' },
        invoiced: money,
        whatWeSoldThem: Object.entries(bought).sort((a, b) => b[1].amount - a[1].amount).slice(0, 20).map(([service, v]) => ({ service, times: v.times, totalAmount: Math.round(v.amount) })),
        projects: projects.map((p) => ({ name: p.name, status: PROJECT[p.status] || '' })),
        recentSupportSubjects: tickets.map((t) => t.subject).filter(Boolean),
        proposals: proposals.map((p) => ({ subject: p.subject, status: PROPOSAL[p.status] || '' })),
        ideasAlreadyWritten: ideas.map((i) => ({ title: i.title, status: i.status })),
        ourServicesAndPrices: items.map((i) => ({ service: i.description, price: i.rate })),
    }
}

const fingerprintOf = (clientId, title) => `${clientId}:${String(title || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim().slice(0, 80)}`

async function gate(cap, clientId) {
    const session = await requirePermission('client_ideas', cap)
    if (!oid(clientId)) throw fail('Client not found', 404)
    const client = await prisma.crmClient.findFirst({ where: { id: clientId, ...(await clientScope(session)) } })
    if (!client) throw fail('Client not found', 404)
    return { session, client, staffId: await getStaffId(session) }
}

/** What the helper needs: is a key set, can it search the web. */
export async function helperStatus(clientId) {
    await gate('view', clientId)
    const ai = await resolveAi().catch(() => null)
    return { ready: !!ai?.model, provider: ai ? PROVIDERS[ai.provider].label : null, model: ai?.model || null, webSearch: ai?.provider === 'anthropic' }
}

/** Research one client: its business, its competitors, and ideas worth proposing. Nothing is saved as an idea until the team picks them. */
export async function researchClient(clientId, body = {}) {
    const { session, client, staffId } = await gate('create', clientId)
    rateLimit(`client-ideas-ai:${session.user.id}`, 12, 3600000)
    const ai = await resolveAi().catch((e) => { throw fail(e.message || 'Add an AI key in Settings → AI first.') })
    if (!ai.model) throw fail('Choose an AI model in Settings → AI first.')
    const focus = FOCUS[body.focus] ? body.focus : 'mixed'
    const count = Math.min(8, Math.max(2, parseInt(body.count, 10) || 5))
    const competitors = (Array.isArray(body.competitors) ? body.competitors : String(body.competitors || '').split(/[\n,]+/)).map((x) => String(x).trim().slice(0, 150)).filter(Boolean).slice(0, 5)
    const web = body.web !== false && ai.provider === 'anthropic'
    const context = await gatherContext(client)
    const lang = LANGS[body.lang] ? body.lang : 'en'
    const system = buildSystem({ about: ai.systemPrompt, lang, web })
    const user = buildUser({ context, focus, count, competitors, note: String(body.note || '') })
    const t = Date.now()
    const out = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: web ? 6000 : 4000, webSearch: web ? 5 : 0, timeoutMs: 240000 })
    const r = parseResearch(out.text)
    const have = new Set((await prisma.crmClientIdea.findMany({ where: { clientId, fingerprint: { in: r.ideas.map((i) => fingerprintOf(clientId, i.title)) } }, select: { fingerprint: true } })).map((x) => x.fingerprint))
    const ideas = r.ideas.map((i) => ({ ...i, duplicate: have.has(fingerprintOf(clientId, i.title)) }))
    const saved = await prisma.crmClientResearch.create({ data: { clientId, summary: r.summary || null, competitors: r.competitors, provider: ai.provider, model: ai.model, webSearch: web, createdBy: staffId || undefined } })
    await audit(session, `AI research for client ${client.company || clientId} with ${PROVIDERS[ai.provider].label} · ${ai.model}${web ? ' (web search)' : ''}`)
    return { research: { id: saved.id, summary: r.summary, competitors: r.competitors, provider: ai.provider, model: ai.model, webSearch: web, createdAt: saved.createdAt }, ideas, ms: Date.now() - t, usage: out.usage }
}

/** The ideas the team picked: written as drafts (internal), tagged AI, with their sources. */
export async function addAiIdeas(clientId, body = {}) {
    const { staffId } = await gate('create', clientId)
    const list = (Array.isArray(body.ideas) ? body.ideas : []).slice(0, 12)
    if (!list.length) throw fail('Pick at least one idea')
    const last = await prisma.crmClientIdea.findFirst({ where: { clientId, status: 'draft' }, orderBy: { position: 'desc' }, select: { position: true } })
    let pos = last?.position || 0
    const made = []
    for (const raw of list) {
        const i = parseResearch(JSON.stringify({ ideas: [raw] })).ideas[0]
        if (!i) continue
        const fingerprint = fingerprintOf(clientId, i.title)
        if (await prisma.crmClientIdea.findFirst({ where: { clientId, fingerprint }, select: { id: true } })) continue
        const row = await prisma.crmClientIdea.create({ data: { clientId, title: i.title, body: storeRich(bodyOf(i), 20000) || null, category: i.category, status: 'draft', visible: false, priority: i.impact >= 3 && i.effort <= 2 ? 3 : 2, impact: i.impact, effort: i.effort, gain: i.gain || null, price: i.price, source: 'ai', sources: i.sources, fingerprint, tags: ['ai'], position: ++pos, addedFrom: staffId || undefined } })
        made.push(row.id)
    }
    return { created: made.length, skipped: list.length - made.length, ids: made }
}
