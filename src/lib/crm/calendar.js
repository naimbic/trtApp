import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { viewScope, isCrmAdmin, getStaffId } from '@/lib/crm/permissions'
import { round2 } from '@/lib/crm/sales/calc'
import { numberPadding, docNumberOf } from '@/lib/crm/numbering'

// Calendar layers shown next to the user's own events (each gated by the matching Perfex feature).
export const LAYERS = ['events', 'tasks', 'invoices', 'projects', 'estimates', 'proposals', 'contracts']
const NAMES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

/** Template calendar colours are names; Perfex stored hex colours, so map those to the nearest name by hue. */
export function colorName(color) {
    if (NAMES.includes(color)) return color
    const m = /^#?([0-9a-f]{6})$/i.exec(color || '')
    if (!m) return 'blue'
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max - min < 0.08) return 'blue'
    let h = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4
    h = (h * 60 + 360) % 360
    return h < 20 || h >= 340 ? 'red' : h < 45 ? 'orange' : h < 70 ? 'yellow' : h < 170 ? 'green' : h < 260 ? 'blue' : 'purple'
}

const iso = (d) => (d ? new Date(d).toISOString() : undefined)

async function context() {
    const session = await auth()
    if (!session?.user?.id) return null
    const authority = session.user.authority || []
    return { session, authority, staffId: await getStaffId(session), admin: isCrmAdmin(authority), can: (f) => viewScope(authority, f) === 'all' }
}

/** Everything that belongs on the calendar between `from` and `to` (ISO dates). */
export async function getCalendarItems({ from, to }) {
    const ctx = await context()
    if (!ctx) return null
    const start = new Date(from)
    const end = new Date(to)
    if (Number.isNaN(+start) || Number.isNaN(+end)) throw new Error('Invalid range')
    const items = []
    const layers = ['events']

    // own + public events (and unowned ones)
    const events = await prisma.crmEvent.findMany({
        where: { start: { lt: end }, OR: [{ end: { gte: start } }, { end: null, start: { gte: start } }] },
    })
    for (const e of events) {
        const mine = !e.userId || e.userId === ctx.staffId
        if (!mine && !e.isPublic && !ctx.admin) continue
        items.push({
            id: `event:${e.id}`,
            title: e.title,
            start: iso(e.start),
            end: iso(e.end),
            eventColor: colorName(e.color),
            type: 'events',
            editable: mine || ctx.admin,
            description: e.description || '',
            isPublic: e.isPublic,
            rawId: e.id,
        })
    }

    const range = { gte: start, lt: end }
    const day = (d) => new Date(d).toISOString().slice(0, 10)
    const add = (type, id, title, date, color, href) => items.push({ id: `${type}:${id}`, title, start: day(date), allDay: true, eventColor: color, type, editable: false, href })

    if (ctx.can('tasks')) {
        layers.push('tasks')
        const rows = await prisma.crmTask.findMany({ where: { dueDate: range, status: { not: 5 } }, select: { id: true, name: true, dueDate: true } })
        rows.forEach((t) => add('tasks', t.id, `Task: ${t.name}`, t.dueDate, 'orange', `/crm/tasks/${t.id}`))
    }
    if (ctx.can('invoices')) {
        layers.push('invoices')
        const rows = await prisma.crmInvoice.findMany({ where: { dueDate: range, status: { notIn: [2, 5, 6] } }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, status: true, dueDate: true, total: true } })
        const pad = await numberPadding()
        rows.forEach((i) => add('invoices', i.id, `Invoice ${docNumberOf(i, pad)} due · ${round2(i.total).toLocaleString('en-US')}`, i.dueDate, 'red', `/crm/invoices/${i.id}`))
    }
    if (ctx.can('projects')) {
        layers.push('projects')
        const rows = await prisma.crmProject.findMany({ where: { deadline: range, status: { notIn: [4, 5] } }, select: { id: true, name: true, deadline: true } })
        rows.forEach((p) => add('projects', p.id, `Project deadline: ${p.name}`, p.deadline, 'purple', `/crm/projects/${p.id}`))
    }
    if (ctx.can('estimates')) {
        layers.push('estimates')
        const rows = await prisma.crmEstimate.findMany({ where: { expiryDate: range, status: { in: [1, 2] } }, select: { id: true, number: true, prefix: true, numberFormat: true, date: true, expiryDate: true } })
        const epad = await numberPadding()
        rows.forEach((e) => add('estimates', e.id, `Estimate ${docNumberOf(e, epad, null)} expires`, e.expiryDate, 'yellow', `/crm/estimates/${e.id}`))
    }
    if (ctx.can('proposals')) {
        layers.push('proposals')
        const rows = await prisma.crmProposal.findMany({ where: { openTill: range, status: { in: [1, 4, 5] } }, select: { id: true, subject: true, openTill: true } })
        rows.forEach((p) => add('proposals', p.id, `Proposal open till: ${p.subject || ''}`, p.openTill, 'green', `/crm/proposals/${p.id}`))
    }
    if (ctx.can('contracts')) {
        layers.push('contracts')
        const rows = await prisma.crmContract.findMany({ where: { dateEnd: range }, select: { id: true, subject: true, dateEnd: true } })
        rows.forEach((c) => add('contracts', c.id, `Contract ends: ${c.subject || ''}`, c.dateEnd, 'blue', `/crm/contracts/${c.id}`))
    }
    return { items, layers }
}

const clean = (b) => {
    const title = String(b.title || '').trim()
    if (!title) throw Object.assign(new Error('Title is required'), { status: 400 })
    const start = new Date(b.start)
    if (Number.isNaN(+start)) throw Object.assign(new Error('Start date is required'), { status: 400 })
    const end = b.end ? new Date(b.end) : null
    if (end && end < start) throw Object.assign(new Error('End must be after start'), { status: 400 })
    return { title, description: b.description || null, start, end, color: NAMES.includes(b.color) ? b.color : 'blue', isPublic: !!b.isPublic }
}

export async function createCalendarEvent(body) {
    const ctx = await context()
    if (!ctx) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const data = clean(body)
    return prisma.crmEvent.create({ data: { ...data, userId: ctx.staffId || undefined } })
}

async function ownEvent(id) {
    const ctx = await context()
    if (!ctx) throw Object.assign(new Error('Unauthorized'), { status: 401 })
    const ev = await prisma.crmEvent.findUnique({ where: { id } })
    if (!ev) throw Object.assign(new Error('Not found'), { status: 404 })
    if (ev.userId && ev.userId !== ctx.staffId && !ctx.admin) throw Object.assign(new Error('Forbidden'), { status: 403 })
    return ev
}

export async function updateCalendarEvent(id, body) {
    const ev = await ownEvent(id)
    const data = clean({ title: ev.title, start: ev.start, end: ev.end, color: ev.color, isPublic: ev.isPublic, description: ev.description, ...body })
    return prisma.crmEvent.update({ where: { id }, data })
}

export async function deleteCalendarEvent(id) {
    await ownEvent(id)
    await prisma.crmEvent.delete({ where: { id } })
    return { success: true }
}
