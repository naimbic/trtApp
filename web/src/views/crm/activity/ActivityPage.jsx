import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbLogin, TbFileInvoice, TbCash, TbFileText, TbPresentation, TbSignature, TbBriefcase, TbLifebuoy, TbChecklist, TbTargetArrow, TbNotes, TbMail, TbEye, TbLock, TbReceipt2, TbSettings, TbCheck, TbUserPlus, TbExternalLink } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Timeline from '@/components/ui/Timeline'
import classNames from '@/utils/classNames'
import { api } from '../kit/api'
import { tr } from '@/utils/t'

// event type -> icon and colour (same family as the template's activity avatars)
const TYPES = {
    login: [<TbLogin key="i" />, 'bg-sky-100 text-sky-600 dark:bg-sky-500/20'],
    invoice: [<TbFileInvoice key="i" />, 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20'],
    payment: [<TbCash key="i" />, 'bg-green-100 text-green-600 dark:bg-green-500/20'],
    estimate: [<TbFileText key="i" />, 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20'],
    accepted: [<TbCheck key="i" />, 'bg-green-100 text-green-600 dark:bg-green-500/20'],
    proposal: [<TbPresentation key="i" />, 'bg-violet-100 text-violet-600 dark:bg-violet-500/20'],
    contract: [<TbSignature key="i" />, 'bg-purple-100 text-purple-600 dark:bg-purple-500/20'],
    project: [<TbBriefcase key="i" />, 'bg-teal-100 text-teal-600 dark:bg-teal-500/20'],
    ticket: [<TbLifebuoy key="i" />, 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'],
    task: [<TbChecklist key="i" />, 'bg-orange-100 text-orange-600 dark:bg-orange-500/20'],
    lead: [<TbTargetArrow key="i" />, 'bg-pink-100 text-pink-600 dark:bg-pink-500/20'],
    converted: [<TbUserPlus key="i" />, 'bg-pink-100 text-pink-600 dark:bg-pink-500/20'],
    client: [<TbUserPlus key="i" />, 'bg-blue-100 text-blue-600 dark:bg-blue-500/20'],
    note: [<TbNotes key="i" />, 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20'],
    mail: [<TbMail key="i" />, 'bg-blue-100 text-blue-600 dark:bg-blue-500/20'],
    view: [<TbEye key="i" />, 'bg-gray-100 text-gray-600 dark:bg-gray-600'],
    vault: [<TbLock key="i" />, 'bg-red-100 text-red-600 dark:bg-red-500/20'],
    expense: [<TbReceipt2 key="i" />, 'bg-rose-100 text-rose-600 dark:bg-rose-500/20'],
    system: [<TbSettings key="i" />, 'bg-gray-100 text-gray-600 dark:bg-gray-600'],
}
// filter groups shown above the timeline
const GROUPS = [
    ['login', 'Sign-ins', ['login']],
    ['sales', 'Sales', ['invoice', 'payment', 'estimate', 'accepted', 'proposal', 'contract', 'expense']],
    ['work', 'Work', ['project', 'task', 'ticket']],
    ['leads', 'Leads', ['lead', 'converted', 'client']],
    ['comms', 'Notes and emails', ['note', 'mail']],
    ['other', 'Other', ['view', 'vault', 'system']],
]

// The server words its entries in English ("Invoice INV-1 created"); show them in the chosen language.
const RULES = [
    [/^Invoice (.+) created$/, tr('Invoice {v} created')], [/^Invoice (.+) sent$/, tr('Invoice {v} sent')], [/^Payment received · (.*)$/, tr('Payment received · {v}')],
    [/^Estimate (.+) created$/, tr('Estimate {v} created')], [/^Estimate (.+) accepted$/, tr('Estimate {v} accepted')], [/^Proposal (.+) created$/, tr('Proposal {v} created')], [/^Proposal (.+) accepted$/, tr('Proposal {v} accepted')],
    [/^Contract “(.*)” signed$/, tr('Contract “{v}” signed')], [/^Contract “(.*)” created$/, tr('Contract “{v}” created')], [/^Project “(.*)” started$/, tr('Project “{v}” started')],
    [/^Ticket #(.+) opened$/, tr('Ticket #{v} opened')], [/^Task: ([\s\S]*)$/, tr('Task: {v}')], [/^Note · (.*)$/, tr('Note · {v}')], [/^Lead note · (.*)$/, tr('Lead note · {v}')], [/^Lead: ([\s\S]*)$/, tr('Lead: {v}')],
    [/^Client opened invoice (.*)$/, tr('Client opened invoice {v}')], [/^Client opened estimate (.*)$/, tr('Client opened estimate {v}')], [/^Client opened proposal (.*)$/, tr('Client opened proposal {v}')], [/^Client opened contract (.*)$/, tr('Client opened contract {v}')], [/^(.*) signed in to the client area$/, tr('{v} signed in to the client area')],
    [/^Password vault: (.*)$/, tr('Password vault: {v}')], [/^from (.*)$/, tr('from {v}')], [/^(\d+) days? after the lead was created$/, tr('{v} days after the lead was created')],
    [/^Lead created$/, tr('Lead created')], [/^Source (.*)$/, tr('source {v}')],
]
const local = (s) => {
    const text = String(s || '')
    if (!text) return ''
    for (const [re, key] of RULES) {
        const m = text.match(re)
        if (m) return key.replace('{v}', m[1] ?? '').replace('{w}', m[2] ?? '')
    }
    return tr(text)
}

const ActivityPage = () => {
    const { kind, id } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [events, setEvents] = useState([])
    const [more, setMore] = useState(false)
    const [busy, setBusy] = useState(true)
    const [error, setError] = useState('')
    const [on, setOn] = useState(GROUPS.map((g) => g[0]))

    const types = useMemo(() => (on.length === GROUPS.length ? '' : GROUPS.filter((g) => on.includes(g[0])).flatMap((g) => g[2]).join(',') || 'none'), [on])
    const load = useCallback(async (before) => {
        setBusy(true)
        try {
            const q = new URLSearchParams({ kind, id, ...(types ? { types } : {}), ...(before ? { before } : {}) })
            const r = await api(`/api/crm/activity?${q}`)
            setData(r)
            setEvents((cur) => (before ? [...cur, ...r.events] : r.events))
            setMore(r.more)
            setError('')
        } catch (e) { setError(e.message) } finally { setBusy(false) }
    }, [kind, id, types])
    useEffect(() => { load() }, [load])

    const days = useMemo(() => {
        const out = []
        events.forEach((e) => { const d = dayjs(e.date).format('YYYY-MM-DD'); if (out[out.length - 1]?.d !== d) out.push({ d, list: [] }); out[out.length - 1].list.push(e) })
        return out
    }, [events])
    const counts = data?.counts || {}
    const groupCount = (g) => g[2].reduce((n, t) => n + (counts[t] || 0), 0)
    const back = () => navigate(kind === 'staff' ? '/team' : `/crm/clients/${id}`)
    const subject = data?.subject

    return (
        <Container>
            <AdaptiveCard>
                <div className="mx-auto max-w-[800px]">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <Button size="sm" variant="plain" icon={<TbArrowLeft className="rtl:rotate-180" />} onClick={back} />
                            {subject && <Avatar size={44} shape="circle" src={subject.image || undefined}>{subject.image ? null : (subject.name || '?').slice(0, 1).toUpperCase()}</Avatar>}
                            <div className="min-w-0"><h3 className="truncate">{tr('Activity log')}</h3><p className="truncate text-sm text-gray-500">{subject ? `${subject.name}${subject.email ? ` · ${subject.email}` : ''}` : ' '}</p></div>
                        </div>
                        <span className="text-xs text-gray-400">{data ? tr('{n} events', { n: data.total }) : ''}</span>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2">
                        {GROUPS.map((g) => {
                            const active = on.includes(g[0])
                            return (
                                <button key={g[0]} type="button" onClick={() => setOn((cur) => (cur.includes(g[0]) ? cur.filter((x) => x !== g[0]) : [...cur, g[0]]))} className={classNames('rounded-full border px-3 py-1 text-xs font-semibold transition', active ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 dark:border-gray-600')}>
                                    {tr(g[1])} <span className="ml-1 opacity-70">{groupCount(g)}</span>
                                </button>
                            )
                        })}
                    </div>

                    {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                    {days.map((day) => (
                        <div key={day.d} className="mb-8">
                            <div className="mb-4 font-semibold uppercase">{dayjs(day.d).format('dddd, DD MMMM')}</div>
                            <Timeline>
                                {day.list.map((e) => {
                                    const [icon, tone] = TYPES[e.type] || TYPES.system
                                    return (
                                        <Timeline.Item key={e.id} media={<Avatar size={25} shape="circle" className={tone}>{icon}</Avatar>}>
                                            <div className="mt-1">
                                                <div className="flex flex-wrap items-baseline gap-x-2">
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{local(e.title)}</span>
                                                    <span className="text-xs text-gray-400">{dayjs(e.date).format('HH:mm')}</span>
                                                    {e.link && <button type="button" onClick={() => navigate(e.link)} className="text-primary" title={tr('Open')}><TbExternalLink /></button>}
                                                </div>
                                                {e.detail && <div className="mt-0.5 text-sm text-gray-500">{local(e.detail)}</div>}
                                            </div>
                                        </Timeline.Item>
                                    )
                                })}
                            </Timeline>
                        </div>
                    ))}
                    {!busy && !events.length && !error && <div className="py-10 text-center text-gray-400">{tr('No activity to show')}</div>}
                    <div className="text-center">
                        {more ? <Button loading={busy} onClick={() => load(events[events.length - 1]?.date)}>{tr('Load more')}</Button> : events.length > 0 && <span className="text-sm text-gray-400">{tr('No more activity to load')}</span>}
                    </div>
                </div>
            </AdaptiveCard>
        </Container>
    )
}

export default ActivityPage
