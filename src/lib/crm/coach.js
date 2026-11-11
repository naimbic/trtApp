import prisma from '@/lib/prisma'
import { getOptions, setOptions } from '@/lib/crm/mailer'
import { chat } from '@/lib/crm/ai/providers'
import { resolveAiForJob, requireSuper, audit } from '@/lib/crm/ai/aiSettings'
import { pushToStaff } from '@/lib/crm/push'
import { getStaffId } from '@/lib/crm/permissions'
import { lastMonth, reviewDue, facts } from '@/lib/crm/coachCalc'

const fail = (m, status = 400) => Object.assign(new Error(m), { status })
const LANG_NAME = { en: 'English', fr: 'French', es: 'Spanish', ja: 'Japanese', ar: 'Arabic' }
export const COACH_NAME = 'trtCRM Coach'
export const ROOM_NAME = '🧠 My monthly review'
const staffName = (s) => [s?.firstName, s?.lastName].filter(Boolean).join(' ') || s?.email || 'Team member'

/** Who should follow all the work: the people chosen in the option (ids, comma separated), else every active administrator. */
async function supervisorsOf(staff, o) {
    const chosen = String(o('coach_supervisors') || '').split(',').map((x) => x.trim()).filter(Boolean)
    const ids = chosen.length ? chosen : staff.filter((s) => s.admin).map((s) => s.id)
    return staff.filter((s) => ids.includes(s.id)).map((s) => s.id)
}

/** All the rows the month needs, read once for everybody. */
async function readMonth(range) {
    const tasks = await prisma.crmTask.findMany({
        where: { createdAt: { lt: range.to }, OR: [{ status: { not: 5 } }, { dateFinished: { gte: range.from } }] },
        select: { id: true, name: true, status: true, dueDate: true, dateFinished: true, createdAt: true, addedFrom: true, description: true, assignees: { select: { staffId: true } }, followers: { select: { staffId: true } }, comments: { select: { staffId: true, createdAt: true } } },
        take: 6000,
    })
    const timers = await prisma.crmTaskTimer.findMany({ where: { startTime: { gte: range.from, lt: range.to } }, select: { staffId: true, startTime: true, endTime: true }, take: 20000 })
    return {
        tasks: tasks.map((t) => ({ id: t.id, name: t.name, status: t.status, dueDate: t.dueDate, dateFinished: t.dateFinished, createdAt: t.createdAt, addedFrom: t.addedFrom, description: t.description, assigneeIds: t.assignees.map((a) => a.staffId), followerIds: t.followers.map((f) => f.staffId), commentStaffIds: t.comments.map((c) => c.staffId).filter(Boolean) })),
        comments: tasks.flatMap((t) => t.comments.filter((c) => c.staffId).map((c) => ({ staffId: c.staffId, createdAt: c.createdAt }))),
        timers,
    }
}

const idle = (f) => !f.tasksCompleted && !f.stillOpenAtMonthEnd && !f.createdForThemselves && !f.tasksCreatedByThem && !f.hoursTracked && !f.commentsWritten

export function promptFor({ name, lang, monthLabel, supervisor, f }) {
    const system = `You are a calm, practical team-work coach for a small digital agency. You write ONE short personal review for ONE team member, from the figures given as JSON. Use ONLY those figures for any number; never invent facts, tasks or numbers. Be kind but direct, specific and short (at most 230 words), no jargon, no tables, no markdown symbols other than line breaks and simple "-" bullets. Start with a one-line greeting by first name. Then four short blocks, each with an emoji heading: 📊 Your month (what they did, in plain words), 👍 What went well, 🔧 What to improve (be concrete: name the habit and one example task when the figures give one), 🎯 Next month: exactly 3 small actions they can start tomorrow. Team rules you must coach on when the figures show a problem: every task needs a deadline, a description and a clear owner; the people in charge (the supervisors) should follow all the work; nobody should create a task for themselves and close it alone with nobody following it (that is "self-validated" work); finish what is open before opening more; use the timer on tasks. ${supervisor ? 'This person is a supervisor: add one line under "What to improve" about how much of the team work they followed (the supervision figures) and which team habit to correct.' : 'This person is not a supervisor.'} Answer in ${LANG_NAME[lang] || 'English'}.`
    const user = `Team member: ${name}. Month: ${monthLabel}.\nFigures (JSON):\n${JSON.stringify(f)}`
    return { system, user }
}

async function write({ ai, name, lang, range, supervisor, f }) {
    const { system, user } = promptFor({ name, lang, monthLabel: range.label, supervisor, f })
    const r = await chat({ provider: ai.provider, apiKey: ai.apiKey, workspaceId: ai.workspaceId, model: ai.model, system, user, maxTokens: 1400, timeoutMs: 120000 })
    return r.text.slice(0, 3500)
}

/** The review lands in the person's own chat conversation "My monthly review" (a private room with a coach as the sender) and a push tells them. */
export async function deliver(staffId, text, range) {
    const rooms = await prisma.crmChatRoom.findMany({ where: { kind: 'group', name: ROOM_NAME, staffIds: { has: staffId } }, take: 5 })
    const room = rooms.find((r) => r.staffIds.length === 1) || (await prisma.crmChatRoom.create({ data: { kind: 'group', name: ROOM_NAME, staffIds: [staffId] } }))
    const body = `${range.label}\n\n${text}`
    const m = await prisma.crmChatMessage.create({ data: { roomId: room.id, senderType: 'coach', senderId: staffId, senderName: COACH_NAME, body } })
    await prisma.crmChatRoom.update({ where: { id: room.id }, data: { lastMessageAt: m.createdAt, lastMessage: `🧠 ${range.label}`.slice(0, 120) } })
    void pushToStaff(staffId, { title: `🧠 ${COACH_NAME}`, body: `Your review for ${range.label} is in your chat.`, url: `/crm/chat?room=${room.id}`, tag: `coach-${range.key}` })
    return room.id
}

/**
 * Write and send the review of one month (default: last month) to one person or to the whole active team.
 * who: 'all' | a staff id. Returns lines for the screen / the cron summary.
 */
export async function runReviews({ who = 'all', range = lastMonth(Date.now(), 'UTC'), dry = false, lines = [] } = {}) {
    const ai = await resolveAiForJob('grow').catch(() => null)
    if (!ai) { lines.push('Monthly team review: no AI key in Settings → AI'); return { sent: 0, lines } }
    const o = await getOptions(['coach_supervisors', 'default_timezone'])
    const staff = await prisma.crmStaff.findMany({ where: { active: true }, select: { id: true, firstName: true, lastName: true, email: true, admin: true, defaultLanguage: true } })
    const supervisors = await supervisorsOf(staff, o)
    const data = await readMonth(range)
    let sent = 0
    for (const s of staff.filter((x) => who === 'all' || x.id === who)) {
        const f = facts({ staffId: s.id, range, tasks: data.tasks, timers: data.timers, comments: data.comments, supervisors })
        if (who === 'all' && idle(f)) { lines.push(`${staffName(s)}: no activity in ${range.label}, skipped`); continue }
        if (dry) { lines.push(`${staffName(s)}: would get the review of ${range.label}`); continue }
        try {
            const text = await write({ ai, name: staffName(s), lang: s.defaultLanguage || 'en', range, supervisor: supervisors.includes(s.id), f })
            await deliver(s.id, text, range)
            sent++; lines.push(`${staffName(s)}: review of ${range.label} sent`)
        } catch (e) { lines.push(`! ${staffName(s)}: ${e.message}`) }
    }
    if (!staff.some((x) => who === 'all' || x.id === who)) lines.push('Team member not found')
    return { sent, lines }
}

/** The cron job: from the 8th at 08:00, once a month, last month's review to everybody. */
export async function coachJob({ o, lines, dry }) {
    const tz = o('default_timezone') || 'UTC'
    const now = Date.now()
    if (!reviewDue({ now, tz, last: o('cron_last_coach') })) return
    const range = lastMonth(now, tz)
    const r = await runReviews({ who: 'all', range, dry, lines })
    if (!dry && !lines.some((l) => l.startsWith('Monthly team review: no AI key'))) await setOptions({ cron_last_coach: currentKey(now, tz) })
    return r
}
const currentKey = (now, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).format(new Date(now)).slice(0, 7)

/* ---------------------------------------- the screen: Settings → AI ---------------------------------------- */
export async function coachStatus() {
    await requireSuper('view')
    const o = await getOptions(['cron_last_coach', 'default_timezone'])
    const tz = o('default_timezone') || 'UTC'
    const ai = await resolveAiForJob('grow').catch(() => null)
    return { ready: !!ai, month: lastMonth(Date.now(), tz).label, last: o('cron_last_coach') || null }
}

/** body: { who: 'me' | 'all' } : write last month's review now. 'me' needs the AI view right, 'all' the edit right. */
export async function sendNow(body = {}) {
    const all = body.who === 'all'
    const session = await requireSuper(all ? 'edit' : 'view')
    const me = await getStaffId(session)
    if (!all && !me) throw fail('Only a team member has a chat to receive it', 403)
    if (!(await resolveAiForJob('grow').catch(() => null))) throw fail('Add an API key in Settings → AI first.')
    const tz = (await getOptions(['default_timezone']))('default_timezone') || 'UTC'
    const range = lastMonth(Date.now(), tz)
    if (all) { // one AI call per person takes minutes: it goes on after the answer, each review arrives in the chat of its person
        void runReviews({ who: 'all', range, lines: [] }).then((r) => audit(session, `Monthly team review (${range.label}) sent to the team: ${r.sent}`)).catch((e) => console.error('[coach]', e))
        return { started: true, sent: 0, month: range.label, lines: [`Writing the review of ${range.label} for each active team member: they arrive in their chat (My monthly review) within a few minutes.`] }
    }
    const lines = []
    const r = await runReviews({ who: me, range, lines })
    await audit(session, `Monthly team review (${range.label}) sent to the requester: ${r.sent}`)
    if (!r.sent && lines.some((l) => l.includes('no AI key'))) throw fail('Add an API key in Settings → AI first.')
    return { sent: r.sent, month: range.label, lines }
}
