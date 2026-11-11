import prisma from '@/lib/prisma'
import { requirePermission } from '@/lib/crm/permissions'
import { getOptions } from '@/lib/crm/mailer'
import { chat } from '@/lib/crm/ai/providers'
import { resolveAiForJob } from '@/lib/crm/ai/aiSettings'
import { colorName, autoColor, readSuggestions } from '@/lib/crm/itemsCalc'

/* The Items page: the products and services of the catalogue, in groups (accordions) that can be coloured and dragged, with an AI helper. */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const oid = (v) => (/^[a-f0-9]{24}$/i.test(String(v || '')) ? String(v) : null)
const LANG_NAME = { en: 'English', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' }
const byPlace = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.description ?? a.name).localeCompare(String(b.description ?? b.name))

const shapeItem = (i) => ({ id: i.id, description: i.description, longDescription: i.longDescription || '', rate: i.rate || 0, taxId: i.taxId || null, tax2Id: i.tax2Id || null, unit: i.unit || '', groupId: i.groupId || null, order: i.order ?? null })

/** Every group with its items in order, the items without a group, the taxes and the currency of the company. */
export async function getBoard() {
    await requirePermission('items', 'view')
    const [groups, items, taxes, cur] = await Promise.all([
        prisma.crmItemGroup.findMany({ take: 500 }),
        prisma.crmItem.findMany({ take: 5000 }),
        prisma.crmTax.findMany({ select: { id: true, name: true, taxRate: true }, take: 200 }),
        prisma.crmCurrency.findFirst({ where: { isDefault: true }, select: { name: true, symbol: true } }),
    ])
    const sorted = [...groups].sort(byPlace)
    const of = (gid) => items.filter((i) => (i.groupId || null) === gid).sort(byPlace).map(shapeItem)
    return {
        groups: sorted.map((g) => ({ id: g.id, name: g.name, color: colorName(g.color || autoColor(g.name)), items: of(g.id) })),
        ungrouped: of(null),
        taxes: taxes.map((t) => ({ id: t.id, name: t.name, rate: t.taxRate })),
        currency: cur?.name || '',
    }
}

export async function saveGroup(body = {}, id = null) {
    await requirePermission('items', id ? 'edit' : 'create')
    const name = String(body.name || '').trim().slice(0, 80)
    if (!name) throw fail('Give the group a name')
    const data = { name, color: colorName(body.color || autoColor(name)) }
    if (id) {
        if (!oid(id) || !(await prisma.crmItemGroup.findUnique({ where: { id }, select: { id: true } }))) throw fail('Group not found', 404)
        await prisma.crmItemGroup.update({ where: { id }, data })
        return { success: true, id }
    }
    if (await prisma.crmItemGroup.findFirst({ where: { name: { equals: name, mode: 'insensitive' } }, select: { id: true } })) throw fail('A group with this name already exists')
    const last = await prisma.crmItemGroup.findMany({ select: { order: true }, take: 1000 })
    const g = await prisma.crmItemGroup.create({ data: { ...data, order: Math.max(-1, ...last.map((x) => x.order ?? -1)) + 1 } })
    return { success: true, id: g.id }
}

/** The items of a deleted group are kept, without a group. */
export async function deleteGroup(id) {
    await requirePermission('items', 'delete')
    if (!oid(id) || !(await prisma.crmItemGroup.findUnique({ where: { id }, select: { id: true } }))) throw fail('Group not found', 404)
    await prisma.crmItem.updateMany({ where: { groupId: id }, data: { groupId: null } })
    await prisma.crmItemGroup.delete({ where: { id } })
    return { success: true }
}

/** body: { groupId: id | null, ids: [...] } the items of one group in their new order (an item dropped from another group joins it); { groups: [ids] } the order of the groups. */
export async function reorder(body = {}) {
    await requirePermission('items', 'edit')
    if (Array.isArray(body.groups)) {
        for (const [i, id] of body.groups.filter(oid).entries()) await prisma.crmItemGroup.updateMany({ where: { id }, data: { order: i } })
        return { success: true }
    }
    const groupId = body.groupId === null || body.groupId === undefined || body.groupId === '' ? null : oid(body.groupId)
    if (body.groupId && !groupId) throw fail('Group not found', 404)
    if (groupId && !(await prisma.crmItemGroup.findUnique({ where: { id: groupId }, select: { id: true } }))) throw fail('Group not found', 404)
    const ids = (Array.isArray(body.ids) ? body.ids : []).filter(oid).slice(0, 2000)
    for (const [i, id] of ids.entries()) await prisma.crmItem.updateMany({ where: { id }, data: { groupId, order: i } })
    return { success: true }
}

/** Several items at once (the ones picked from the AI suggestions). */
export async function bulkCreate(body = {}) {
    await requirePermission('items', 'create')
    const groupId = oid(body.groupId)
    if (groupId && !(await prisma.crmItemGroup.findUnique({ where: { id: groupId }, select: { id: true } }))) throw fail('Group not found', 404)
    const list = (Array.isArray(body.items) ? body.items : []).slice(0, 40)
    if (!list.length) throw fail('Choose at least one item')
    const rows = await prisma.crmItem.findMany({ where: { groupId }, select: { order: true }, take: 2000 })
    let order = Math.max(-1, ...rows.map((r) => r.order ?? -1)) + 1
    let n = 0
    for (const x of list) {
        const description = String(x.description || '').trim().slice(0, 120)
        if (!description) continue
        await prisma.crmItem.create({ data: { description, longDescription: String(x.longDescription || '').trim().slice(0, 1500) || null, rate: Math.max(0, Number(x.rate) || 0), unit: String(x.unit || '').trim().slice(0, 30) || null, groupId, order: order++ } })
        n++
    }
    return { success: true, created: n }
}

/** The AI writes items for the catalogue from a short description of what the company sells (the person reviews them before they are added). */
export async function suggest(body = {}) {
    await requirePermission('items', 'create')
    const prompt = String(body.prompt || '').trim().slice(0, 600)
    if (prompt.length < 3) throw fail('Describe what you sell in a few words')
    const ai = await resolveAiForJob('items').catch(() => null)
    if (!ai) throw fail('Add an API key in Settings → AI first.')
    const groupId = oid(body.groupId)
    const [group, groups, o, cur] = await Promise.all([
        groupId ? prisma.crmItemGroup.findUnique({ where: { id: groupId }, select: { name: true } }) : null,
        prisma.crmItemGroup.findMany({ select: { name: true }, take: 100 }),
        getOptions(['companyname']),
        prisma.crmCurrency.findFirst({ where: { isDefault: true }, select: { name: true } }),
    ])
    const existing = (await prisma.crmItem.findMany({ select: { description: true }, take: 300 })).map((i) => i.description)
    const count = Math.max(3, Math.min(12, Number(body.count) || 8))
    const lang = LANG_NAME[body.language] || 'English'
    const system = `You write the product and service catalogue of a small agency${o('companyname') ? ` called ${o('companyname')}` : ''}${ai.systemPrompt ? `. About the company: ${String(ai.systemPrompt).slice(0, 800)}` : ''}. The items are used as lines on proposals, estimates and invoices, so each one must be a clear, sellable line: a short name, one or two sentences saying exactly what the client gets, a unit (hour, day, month, page, project, piece...) and a realistic price in ${cur?.name || 'the company currency'} for a small agency in that market. Never repeat an item that already exists. Answer in ${lang}. Return ONLY a JSON array (no text around it) of ${count} objects: {"description": name of at most 80 characters, "longDescription": at most 300 characters, "unit": one word, "rate": a number}.`
    const user = `What to write items for: ${prompt}\n${group ? `They go in the group "${group.name}".\n` : ''}Existing groups: ${groups.map((g) => g.name).join(', ') || 'none'}.\nItems that already exist (do not repeat): ${existing.slice(0, 120).join(' | ') || 'none'}.`
    let r
    try { r = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: 2500, timeoutMs: 90000 }) } catch (e) { throw fail(e.message, 502) }
    const items = readSuggestions(r.text, { max: count, existing })
    if (!items.length) throw fail('The AI answer could not be read. Try again, with a bit more detail.', 502)
    return { items, currency: cur?.name || '' }
}
