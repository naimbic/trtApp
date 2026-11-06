// The team writes to the client on a shared task: the client's contacts get a message on their phone and an email, unless the contact switched task
// emails off or the client page switched the "Tasks" emails off.
import prisma from '@/lib/prisma'
import { emailOff } from '@/lib/crm/clientEmailAccess'
import { publicBase } from '@/lib/crm/shortLinks'
import { pushToContacts } from '@/lib/crm/push'

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** The client a task is shared with: its own tasks, the tasks of its projects, the tasks of its lead (once converted). */
export async function clientOfTask(task) {
    if (task.relType === 'customer') return task.relId
    if (task.relType === 'project') return (await prisma.crmProject.findUnique({ where: { id: task.relId }, select: { clientId: true } }))?.clientId || null
    if (task.relType === 'lead') return (await prisma.crmLead.findUnique({ where: { id: task.relId }, select: { clientId: true } }))?.clientId || null
    return null
}

export async function tellClientOfTask(task, { who, text }) {
    const clientId = await clientOfTask(task)
    if (!clientId || !task.visibleToClient) return { sent: 0 }
    const client = await prisma.crmClient.findUnique({ where: { id: clientId }, select: { company: true } })
    const link = `${publicBase()}/portal/tasks/${task.id}`
    void pushToContacts({ clientId }, { title: who || client?.company || 'trtCRM', body: `${task.name}: ${text}`.slice(0, 140), url: `/portal/tasks/${task.id}`, tag: `task-${task.id}` })
    if (await emailOff(clientId, 'tasks')) return { sent: 0 }
    const contacts = await prisma.crmContact.findMany({ where: { clientId, active: true, taskEmails: { not: false } }, select: { email: true } })
    const { deliver } = await import('@/lib/crm/mailer')
    let sent = 0
    const seen = new Set()
    for (const c of contacts) {
        const to = String(c.email || '').trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || seen.has(to)) continue
        seen.add(to)
        const html = `<p>${esc(who || 'Our team')} wrote on the task <b>${esc(task.name)}</b>:</p><blockquote style="margin:8px 0;padding:8px 12px;border-left:3px solid #cbd5e1;color:#334155">${esc(text).replace(/\n/g, '<br>')}</blockquote><p><a href="${esc(link)}">Open the task</a> to answer or add files.</p>`
        const r = await deliver({ to, subject: `${client?.company ? `${client.company} · ` : ''}${task.name}`, html }).catch(() => ({ sent: false }))
        if (r?.sent) sent++
    }
    return { sent }
}
