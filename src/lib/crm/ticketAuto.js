import prisma from '@/lib/prisma'
import { getOptions, setOptions, mergeFields, sendTemplate } from '@/lib/crm/mailer'
import { publicBase } from '@/lib/crm/shortLinks'
import { requirePermission, isCrmAdmin } from '@/lib/crm/permissions'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const toHtml = (t) => esc(t).replace(/\r?\n/g, '<br />')

/** The merge fields an automatic message can use (shown in the settings window). */
export const AUTO_FIELDS = ['contact_firstname', 'client_name', 'ticket_id', 'ticket_subject', 'ticket_status', 'ticket_priority', 'ticket_department', 'agent_name', 'ticket_url', 'company_name']


/** Ready-made messages (in the languages of the app) for the statuses of a ticket. `match` finds the status they belong to by its name. */
export const AUTO_TEMPLATES = [
    { key: 'received', name: 'Request received', on: 'created', text: {
        en: 'Hello {contact_firstname},\n\nThank you for contacting us. We received your request #{ticket_id} ({ticket_subject}) and our team will answer as soon as possible.\n\nYou can follow it here: {ticket_url}\n\n{company_name}',
        fr: 'Bonjour {contact_firstname},\n\nMerci de nous avoir contactés. Nous avons bien reçu votre demande n°{ticket_id} ({ticket_subject}) et notre équipe vous répondra dans les meilleurs délais.\n\nVous pouvez la suivre ici : {ticket_url}\n\n{company_name}',
        es: 'Hola {contact_firstname}:\n\nGracias por contactarnos. Hemos recibido su solicitud n.º {ticket_id} ({ticket_subject}) y nuestro equipo responderá lo antes posible.\n\nPuede seguirla aquí: {ticket_url}\n\n{company_name}',
        ja: '{contact_firstname} 様\n\nお問い合わせありがとうございます。依頼 #{ticket_id}（{ticket_subject}）を受け付けました。担当チームができるだけ早くご返信します。\n\n進捗はこちらでご確認いただけます: {ticket_url}\n\n{company_name}',
        ar: 'مرحبًا {contact_firstname}،\n\nشكرًا لتواصلك معنا. استلمنا طلبك رقم {ticket_id} ({ticket_subject}) وسيردّ عليك فريقنا في أقرب وقت.\n\nيمكنك متابعته هنا: {ticket_url}\n\n{company_name}' } },
    { key: 'reopened', name: 'Request reopened', match: '^open', text: {
        en: 'Hello {contact_firstname},\n\nYour request #{ticket_id} ({ticket_subject}) is open again and our team will look at it.\n\n{ticket_url}\n\n{company_name}',
        fr: 'Bonjour {contact_firstname},\n\nVotre demande n°{ticket_id} ({ticket_subject}) est de nouveau ouverte et notre équipe va la traiter.\n\n{ticket_url}\n\n{company_name}',
        es: 'Hola {contact_firstname}:\n\nSu solicitud n.º {ticket_id} ({ticket_subject}) está abierta de nuevo y nuestro equipo la revisará.\n\n{ticket_url}\n\n{company_name}',
        ja: '{contact_firstname} 様\n\n依頼 #{ticket_id}（{ticket_subject}）を再開しました。担当チームが対応します。\n\n{ticket_url}\n\n{company_name}',
        ar: 'مرحبًا {contact_firstname}،\n\nطلبك رقم {ticket_id} ({ticket_subject}) مفتوح من جديد وسيتولاه فريقنا.\n\n{ticket_url}\n\n{company_name}' } },
    { key: 'in_progress', name: 'We are working on it', match: 'progress|working|process', text: {
        en: 'Hello {contact_firstname},\n\nGood news: our team is now working on your request #{ticket_id} ({ticket_subject}). We will keep you informed.\n\n{ticket_url}\n\n{company_name}',
        fr: 'Bonjour {contact_firstname},\n\nBonne nouvelle : notre équipe travaille maintenant sur votre demande n°{ticket_id} ({ticket_subject}). Nous vous tiendrons informé.\n\n{ticket_url}\n\n{company_name}',
        es: 'Hola {contact_firstname}:\n\nBuenas noticias: nuestro equipo ya está trabajando en su solicitud n.º {ticket_id} ({ticket_subject}). Le mantendremos informado.\n\n{ticket_url}\n\n{company_name}',
        ja: '{contact_firstname} 様\n\n依頼 #{ticket_id}（{ticket_subject}）の対応を開始しました。進捗はお知らせします。\n\n{ticket_url}\n\n{company_name}',
        ar: 'مرحبًا {contact_firstname}،\n\nأخبار جيدة: فريقنا يعمل الآن على طلبك رقم {ticket_id} ({ticket_subject}). سنبقيك على اطلاع.\n\n{ticket_url}\n\n{company_name}' } },
    { key: 'answered', name: 'We replied to you', match: 'answer|repl', text: {
        en: 'Hello {contact_firstname},\n\nWe replied to your request #{ticket_id} ({ticket_subject}). Please read our answer and tell us if you need anything else.\n\n{ticket_url}\n\n{company_name}',
        fr: 'Bonjour {contact_firstname},\n\nNous avons répondu à votre demande n°{ticket_id} ({ticket_subject}). Merci de lire notre réponse et de nous dire si vous avez besoin d\'autre chose.\n\n{ticket_url}\n\n{company_name}',
        es: 'Hola {contact_firstname}:\n\nHemos respondido a su solicitud n.º {ticket_id} ({ticket_subject}). Lea nuestra respuesta y díganos si necesita algo más.\n\n{ticket_url}\n\n{company_name}',
        ja: '{contact_firstname} 様\n\n依頼 #{ticket_id}（{ticket_subject}）に返信しました。ご確認のうえ、他にご要望があればお知らせください。\n\n{ticket_url}\n\n{company_name}',
        ar: 'مرحبًا {contact_firstname}،\n\nرددنا على طلبك رقم {ticket_id} ({ticket_subject}). يرجى قراءة الردّ وإخبارنا إن احتجت إلى أي شيء آخر.\n\n{ticket_url}\n\n{company_name}' } },
    { key: 'on_hold', name: 'On hold, we need something', match: 'hold|wait|pending', text: {
        en: 'Hello {contact_firstname},\n\nYour request #{ticket_id} ({ticket_subject}) is on hold: we are waiting for more information or for a third party. We will come back to you very soon.\n\n{ticket_url}\n\n{company_name}',
        fr: 'Bonjour {contact_firstname},\n\nVotre demande n°{ticket_id} ({ticket_subject}) est en attente : nous attendons des informations complémentaires ou un tiers. Nous revenons vers vous très vite.\n\n{ticket_url}\n\n{company_name}',
        es: 'Hola {contact_firstname}:\n\nSu solicitud n.º {ticket_id} ({ticket_subject}) está en espera: aguardamos más información o a un tercero. Volveremos a contactarle muy pronto.\n\n{ticket_url}\n\n{company_name}',
        ja: '{contact_firstname} 様\n\n依頼 #{ticket_id}（{ticket_subject}）は保留中です。追加情報または第三者の対応を待っています。まもなくご連絡します。\n\n{ticket_url}\n\n{company_name}',
        ar: 'مرحبًا {contact_firstname}،\n\nطلبك رقم {ticket_id} ({ticket_subject}) قيد الانتظار: ننتظر معلومات إضافية أو طرفًا ثالثًا. سنعود إليك قريبًا جدًا.\n\n{ticket_url}\n\n{company_name}' } },
    { key: 'closed', name: 'Request closed', match: 'clos|resolv|done', text: {
        en: 'Hello {contact_firstname},\n\nYour request #{ticket_id} ({ticket_subject}) is now closed. If you need more help, just reply and it will reopen. We would love to know how we did: open the request and give us a quick rating.\n\n{ticket_url}\n\nThank you,\n{company_name}',
        fr: 'Bonjour {contact_firstname},\n\nVotre demande n°{ticket_id} ({ticket_subject}) est maintenant clôturée. Si vous avez besoin d\'aide, répondez simplement et elle sera rouverte. Dites-nous ce que vous en avez pensé : ouvrez la demande et donnez-nous une note rapide.\n\n{ticket_url}\n\nMerci,\n{company_name}',
        es: 'Hola {contact_firstname}:\n\nSu solicitud n.º {ticket_id} ({ticket_subject}) está ahora cerrada. Si necesita más ayuda, responda y se reabrirá. Nos gustaría saber cómo lo hicimos: abra la solicitud y valórenos rápidamente.\n\n{ticket_url}\n\nGracias,\n{company_name}',
        ja: '{contact_firstname} 様\n\n依頼 #{ticket_id}（{ticket_subject}）を完了としました。さらにサポートが必要な場合は返信してください。再開します。対応はいかがでしたか？依頼を開いて簡単な評価をお願いします。\n\n{ticket_url}\n\nありがとうございました。\n{company_name}',
        ar: 'مرحبًا {contact_firstname}،\n\nأُغلق طلبك رقم {ticket_id} ({ticket_subject}). إذا احتجت إلى مساعدة إضافية فقط ردّ وسيُعاد فتحه. يسعدنا معرفة رأيك: افتح الطلب وأعطنا تقييمًا سريعًا.\n\n{ticket_url}\n\nشكرًا لك،\n{company_name}' } },
]

async function readRules() {
    try { const v = JSON.parse((await getOptions(['ticket_auto_messages']))('ticket_auto_messages', '[]')); return Array.isArray(v) ? v : [] } catch { return [] }
}

/** Rules to edit: one per status of the tickets plus "ticket created", with what is saved. */
export async function getAutoRules() {
    const session = await requirePermission('tickets', 'view')
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Only an administrator can change the automatic messages', 403)
    const [saved, statuses] = await Promise.all([readRules(), prisma.crmTicketStatus.findMany({ orderBy: { statusOrder: 'asc' } })])
    const by = Object.fromEntries(saved.map((r) => [r.on, r]))
    const make = (on, title) => ({ on, title, enabled: !!by[on]?.enabled, message: by[on]?.message || '', email: by[on] ? by[on].email !== false : true, thread: by[on] ? by[on].thread !== false : true })
    return { rules: [make('created', 'When a request is received (created by the client)'), ...statuses.map((s) => ({ ...make(s.id, s.name), color: s.statusColor || '#64748b' }))], fields: AUTO_FIELDS, templates: AUTO_TEMPLATES }
}

export async function saveAutoRules(body) {
    const session = await requirePermission('tickets', 'view')
    if (!isCrmAdmin(session.user.authority || [])) throw fail('Only an administrator can change the automatic messages', 403)
    const statuses = new Set((await prisma.crmTicketStatus.findMany({ select: { id: true } })).map((s) => s.id))
    const out = []
    for (const r of Array.isArray(body?.rules) ? body.rules : []) {
        if (r.on !== 'created' && !statuses.has(r.on)) continue
        const message = String(r.message || '').trim().slice(0, 5000)
        if (r.enabled && !message) throw fail('Write the message of every rule that is switched on')
        if (r.enabled && r.email === false && r.thread === false) throw fail('A rule must send the message by email or in the conversation (or both)')
        out.push({ on: r.on, enabled: !!r.enabled, message, email: r.email !== false, thread: r.thread !== false })
    }
    await setOptions({ ticket_auto_messages: JSON.stringify(out) })
    return { success: true }
}

async function varsFor(t) {
    const [dept, prio, status, agent, client, contact, o] = await Promise.all([
        t.departmentId ? prisma.crmDepartment.findUnique({ where: { id: t.departmentId }, select: { name: true } }) : null,
        t.priorityId ? prisma.crmTicketPriority.findUnique({ where: { id: t.priorityId }, select: { name: true } }) : null,
        t.statusId ? prisma.crmTicketStatus.findUnique({ where: { id: t.statusId }, select: { name: true } }) : null,
        t.assignedId ? prisma.crmStaff.findUnique({ where: { id: t.assignedId }, select: { firstName: true, lastName: true } }) : null,
        t.clientId ? prisma.crmClient.findUnique({ where: { id: t.clientId }, select: { company: true } }) : null,
        t.contactId ? prisma.crmContact.findUnique({ where: { id: t.contactId }, select: { firstName: true, email: true } }) : null,
        getOptions(['companyname']),
    ])
    return {
        contact_firstname: contact?.firstName || (t.name || '').split(' ')[0] || '', client_name: client?.company || '', ticket_id: String(t.legacyId ?? ''), ticket_subject: t.subject || '', ticket_status: status?.name || '',
        ticket_priority: prio?.name || '', ticket_department: dept?.name || '', agent_name: agent ? [agent.firstName, agent.lastName].filter(Boolean).join(' ') : '', ticket_url: `${publicBase()}/portal/tickets/${t.id}`, company_name: o('companyname'),
        _email: contact?.email || t.email || null,
    }
}

/**
 * Sends the automatic message of a rule: `on` = 'created' or the id of the status the ticket just got.
 * It is written in the conversation (marked automatic) and/or emailed to the client. Never throws: the action behind it must not fail.
 */
export async function autoMessage(t, on) {
    try {
        const rule = (await readRules()).find((r) => r.on === on && r.enabled && String(r.message || '').trim())
        if (!rule) return null
        const { _email, ...vars } = await varsFor(t)
        const text = mergeFields(rule.message, vars)
        let thread = false, mail = null
        if (rule.thread !== false) {
            const author = t.assignedId || (await prisma.crmStaff.findFirst({ where: { active: true, admin: true }, select: { id: true } }))?.id || (await prisma.crmStaff.findFirst({ where: { active: true }, select: { id: true } }))?.id
            if (author) {
                await prisma.crmTicketReply.create({ data: { ticketId: t.id, adminId: author, name: vars.company_name || 'Support', message: toHtml(text), internal: false, isAuto: true } })
                await prisma.crmTicket.update({ where: { id: t.id }, data: { lastReply: new Date(), clientRead: 0 } })
                thread = true
            }
        }
        if (rule.email !== false && _email) mail = await sendTemplate({ slug: 'ticket-reply', to: _email, data: { ...vars, ticket_message: text }, relType: 'ticket', relId: t.id })
        return { thread, mail }
    } catch (e) { console.error('[ticket auto message]', e.message); return null }
}
