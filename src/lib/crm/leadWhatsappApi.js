import prisma from '@/lib/prisma'
import { leadForWhatsapp } from '@/lib/crm/leadsApi'
import { sendWhatsapp, whatsappSetup } from '@/lib/crm/channels'
import { normalizeWhatsappNumber, phoneTail, incomingMessages, deliveryStatuses, statusMoves, windowOpen } from '@/lib/crm/whatsappCalc'

/**
 * The WhatsApp tab of a lead: what the lead wrote to the company number and what the team answered, through the WhatsApp Cloud API
 * (the account of Settings > WhatsApp & Telegram). Messages come in by the webhook Meta calls (/api/crm/public/whatsapp).
 * A message finds its lead by the last 9 digits of the phone, so the way the number was typed on the lead does not matter.
 */
const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const plain = (v) => JSON.parse(JSON.stringify(v))

const whereOf = (lead) => { const tail = phoneTail(lead.phoneNumber); return tail ? { OR: [{ leadId: lead.id }, { tail, leadId: null }, { tail, leadId: { isSet: false } }] } : { leadId: lead.id } }

async function view(lead, maySend) {
    const rows = (await prisma.crmLeadWhatsapp.findMany({ where: whereOf(lead), orderBy: { date: 'desc' }, take: 300 })).reverse()
    const staff = await prisma.crmStaff.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.staffId).filter(Boolean))] } }, select: { id: true, firstName: true, lastName: true } })
    const by = Object.fromEntries(staff.map((x) => [x.id, `${x.firstName || ''} ${x.lastName || ''}`.trim()]))
    const lastIn = [...rows].reverse().find((r) => r.direction === 'in')
    const setup = await whatsappSetup()
    const n = normalizeWhatsappNumber(lead.phoneNumber)
    return plain({
        messages: rows.map((r) => ({ id: r.id, direction: r.direction, body: r.body || '', kind: r.kind, status: r.status, error: r.error || '', date: r.date, by: by[r.staffId] || '', name: r.name || '' })),
        phone: lead.phoneNumber || '', numberError: lead.phoneNumber ? n.error || '' : '', ready: setup.ready, template: setup.template,
        open: windowOpen(lastIn?.date), lastIn: lastIn?.date || null, can: { send: maySend },
    })
}

/** GET: the conversation with the lead. */
export async function listLeadWhatsapp(id) {
    const { lead, maySend } = await leadForWhatsapp(id)
    return view(lead, maySend)
}

/** POST { text }: answer the lead by WhatsApp. A free text during the 24 hours after the lead's last message; after that WhatsApp only takes the approved template. */
export async function sendLeadWhatsapp(id, body = {}) {
    const { lead, staffId, maySend } = await leadForWhatsapp(id, { send: true })
    const text = String(body.text || '').trim().slice(0, 3900)
    if (!text) throw fail('Write a message first')
    if (!lead.phoneNumber) throw fail('This lead has no phone number: add it in the Profile tab')
    const n = normalizeWhatsappNumber(lead.phoneNumber)
    if (n.error) throw fail(`The phone of this lead cannot be used on WhatsApp. ${n.error}`)
    const setup = await whatsappSetup()
    if (!setup.ready) throw fail('WhatsApp is not set up (Settings → WhatsApp & Telegram)')
    const lastIn = await prisma.crmLeadWhatsapp.findFirst({ where: { AND: [whereOf(lead), { direction: 'in' }] }, orderBy: { date: 'desc' }, select: { date: true } })
    const free = windowOpen(lastIn?.date)
    if (!free && !setup.template) throw fail('This lead has not written in the last 24 hours: WhatsApp then only accepts an approved template. Choose one in Settings → WhatsApp & Telegram.')
    const r = await sendWhatsapp(n.to, text, undefined, { plain: free })
    await prisma.crmLeadWhatsapp.create({ data: { leadId: lead.id, direction: 'out', number: n.to, tail: phoneTail(n.to), body: text, kind: r.mode === 'template' ? 'template' : 'text', waId: r.id || null, status: r.sent ? 'sent' : 'failed', error: r.sent ? null : r.error || 'Not sent', staffId: staffId || undefined } })
    if (r.sent) await prisma.crmLead.update({ where: { id: lead.id }, data: { lastContact: new Date() } }).catch(() => {})
    const out = await view(lead, maySend)
    if (!r.sent) throw Object.assign(fail(r.error || 'The message could not be sent', 502), { data: out })
    return out
}

/** The lead (not lost in a customer) or the client contact with this phone. */
async function whoHas(tail) {
    if (!tail) return {}
    const last4 = tail.slice(-2) // phones are typed with spaces and dots (06 12 34 56 78): only the last two digits are sure to stand together; the exact match is made below
    const leads = await prisma.crmLead.findMany({ where: { phoneNumber: { contains: last4 } }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, phoneNumber: true, assigned: true, assignedIds: true, clientId: true }, take: 3000 })
    const lead = leads.find((l) => phoneTail(l.phoneNumber) === tail)
    if (lead) return { lead }
    const contacts = await prisma.crmContact.findMany({ where: { OR: [{ phoneNumber: { contains: last4 } }, { whatsappNumber: { contains: last4 } }] }, select: { clientId: true, phoneNumber: true, whatsappNumber: true }, take: 3000 })
    const c = contacts.find((x) => phoneTail(x.phoneNumber) === tail || phoneTail(x.whatsappNumber) === tail)
    return c ? { clientId: c.clientId } : {}
}

/** What Meta tells the webhook: the messages people wrote (kept, and the team of the lead is told) and the delivered / read marks of ours. */
export async function recordWhatsappWebhook(payload) {
    let received = 0
    for (const m of incomingMessages(payload)) {
        if (await prisma.crmLeadWhatsapp.findFirst({ where: { waId: m.id }, select: { id: true } })) continue // Meta repeats a call it thinks was lost
        const tail = phoneTail(m.from)
        const who = await whoHas(tail)
        await prisma.crmLeadWhatsapp.create({ data: { leadId: who.lead?.id || undefined, clientId: who.lead ? undefined : who.clientId || undefined, direction: 'in', number: m.from, tail, name: m.name || null, body: m.text || null, kind: m.kind, waId: m.id, status: 'received', date: new Date(m.at) } })
        received++
        if (!who.lead) continue
        try {
            const l = who.lead, link = `/crm/leads/${l.id}?tab=whatsapp`, text = (m.text || `(${m.kind})`).slice(0, 160)
            const staff = await prisma.crmStaff.findMany({ where: { id: { in: [...new Set([l.assigned, ...(l.assignedIds || [])].filter(Boolean))] }, active: true }, select: { id: true } })
            const { notifyNotice } = await import('@/lib/crm/notifyMail')
            for (const s of staff) {
                await prisma.crmNotification.create({ data: { toUserId: s.id, fromFullName: l.name || m.name || 'WhatsApp', description: `💬 WhatsApp: ${text}`.slice(0, 200), link, additionalData: 'lead_whatsapp', isRead: false } })
                notifyNotice(s.id, { kind: 'lead', headlineKey: 'whatsappIn', vars: {}, link, title: l.name || '', note: text })
            }
        } catch (e) { console.error('[whatsapp in]', e.message) }
    }
    for (const st of deliveryStatuses(payload)) {
        const row = await prisma.crmLeadWhatsapp.findFirst({ where: { waId: st.id, direction: 'out' }, select: { id: true, status: true } })
        if (row && statusMoves(row.status, st.status)) await prisma.crmLeadWhatsapp.update({ where: { id: row.id }, data: { status: st.status, error: st.status === 'failed' ? st.error || 'Not delivered' : null } })
    }
    return { received }
}
