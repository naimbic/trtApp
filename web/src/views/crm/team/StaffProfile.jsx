/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbArrowLeft, TbChecklist, TbAlertTriangle, TbCircleCheck, TbClock, TbMail, TbPhone, TbBrandWhatsapp } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import ScoreRing from '@/components/crm/ScoreRing'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { api } from '../kit/api'
import { hm, WorkDays, WorkChart } from './WorkHours'
import { tr } from '@/utils/t'

const initials = (m) => (m.name || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

/** One measure of the score as a bar. v = null: nothing to measure yet. */
const Measure = ({ label, hint, v }) => (
    <div className="mb-4 last:mb-0">
        <div className="mb-1 flex items-center justify-between text-sm"><span className="font-semibold">{label}</span><span className="text-gray-500">{v === null ? '–' : `${v}%`}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${v ?? 0}%` }} /></div>
        <div className="mt-1 text-xs text-gray-400">{hint}</div>
    </div>
)

const TaskRow = ({ t }) => (
    <Link to={`/crm/tasks/${t.id}`} className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 text-sm last:border-0 dark:border-gray-700">
        <span className="min-w-0 truncate font-medium">{t.name}</span>
        <span className="shrink-0 text-xs text-gray-400">{t.dateFinished && t.status === 5 ? dayjs(t.dateFinished).format('DD MMM') : t.dueDate ? dayjs(t.dueDate).format('DD MMM') : ''}</span>
    </Link>
)

/** One team member: the score ring, how it is made, and what they are working on. */
const StaffProfile = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [wh, setWh] = useState(null)
    useEffect(() => { api(`/api/crm/team/${id}`).then(setD).catch((e) => setError(e.message)) }, [id])
    useEffect(() => { api(`/api/crm/work-hours?staffId=${id}&from=${dayjs().subtract(13, 'day').format('YYYY-MM-DD')}&to=${dayjs().format('YYYY-MM-DD')}`).then((x) => setWh(x.people?.[0] || null)).catch(() => setWh(null)) }, [id])

    if (error) return <Container><div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div></Container>
    if (!d) return <Container><div className="py-10 text-center text-gray-400">{tr('Loading…')}</div></Container>
    const m = d.member, s = m.score, c = s?.counts || {}, p = s?.parts || {}
    const phone = m.phone

    return (
        <Container>
            <InvoiceHead
                title={m.name}
                stats={[
                    { icon: <TbChecklist />, label: tr('Open tasks'), value: String(c.open ?? '–') },
                    { icon: <TbAlertTriangle />, label: tr('Overdue'), value: String(c.overdue ?? '–') },
                    { icon: <TbCircleCheck />, label: tr('Done in 30 days'), value: String(c.done ?? '–') },
                    { icon: <TbClock />, label: tr('Hours tracked (30 days)'), value: String(c.hours ?? '–') },
                ]}
            />
            <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary" onClick={() => navigate('/crm/staff')}><TbArrowLeft />{tr('Team')}</button>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_1fr]">
                <div className="pt-col pt-col--sticky">
                    <section className="pt-card pt-prof">
                        <div className="mb-3 flex justify-center">
                            <ScoreRing score={s} size={128} width={6} badge>
                                <Avatar shape="circle" size={114} {...(m.image ? { src: m.image } : {})}>{m.image ? null : initials(m)}</Avatar>
                            </ScoreRing>
                        </div>
                        <h2 className="pt-name">{m.name}</h2>
                        <p className="pt-role">{[m.jobTitle, m.admin ? tr('Super Admin') : m.role?.name].filter(Boolean).join(' · ') || ' '}</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            <Tag className={m.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}>{m.active ? tr('Active') : tr('Inactive')}</Tag>
                            {m.departments.map((x) => <Tag key={x.id}>{x.name}</Tag>)}
                        </div>
                        <div className="pt-acts">
                            {m.email && <a className="pt-act" href={`mailto:${m.email}`}><TbMail />{tr('Email')}</a>}
                            {phone && <a className="pt-act" href={`tel:${phone.replace(/\s/g, '')}`}><TbPhone />{tr('Call')}</a>}
                            {(m.whatsapp || phone) && <a className="pt-act" href={`https://wa.me/${(m.whatsapp || phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"><TbBrandWhatsapp />{tr('WhatsApp')}</a>}
                        </div>
                        <dl className="mt-4 space-y-2 text-left text-sm">
                            {m.email && <div><dt className="text-xs text-gray-400">{tr('Email')}</dt><dd className="truncate">{m.email}</dd></div>}
                            {phone && <div><dt className="text-xs text-gray-400">{tr('Phone')}</dt><dd>{phone}</dd></div>}
                            {m.lastLogin && <div><dt className="text-xs text-gray-400">{tr('Last login')}</dt><dd>{dayjs(m.lastLogin).format('DD MMM YYYY, HH:mm')}</dd></div>}
                        </dl>
                    </section>
                    {wh && <WorkChart wh={wh} />}
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    <section className="pt-card">
                        <h3>{tr('Score')}<span className="text-2xl font-extrabold">{s?.score === null || !s ? '–' : `${s.score}%`}</span></h3>
                        <Measure label={tr('Tasks completed')} hint={tr('Of the tasks due or finished in the last 30 days, the share that is complete')} v={p.completion ?? null} />
                        <Measure label={tr('Finished on time')} hint={tr('Of the finished tasks, the share done by the due date')} v={p.onTime ?? null} />
                        <Measure label={tr('Time tracked')} hint={tr('Timer hours against 8 hours per working day; only counted when they use timers')} v={p.hours ?? null} />
                        <p className="mt-3 text-xs text-gray-400">{tr('The score is the average of the measures that have data.')}</p>
                    </section>
                    {wh && (
                        <section className="pt-card">
                            <h3>{tr('Work hours, last 14 days')}<span className="text-sm font-semibold text-gray-500">{hm(wh.totals.active)} / {hm(wh.totals.expected)}{wh.totals.overtime > 0 ? ` · +${hm(wh.totals.overtime)}` : ''}</span></h3>
                            <WorkDays wh={wh} />
                        </section>
                    )}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <section className="pt-card"><h3>{tr('Open tasks')}</h3>{d.open.length ? d.open.map((t) => <TaskRow key={t.id} t={t} />) : <div className="py-4 text-center text-sm text-gray-400">{tr('Nothing open')}</div>}</section>
                        <section className="pt-card"><h3>{tr('Recently completed')}</h3>{d.done.length ? d.done.map((t) => <TaskRow key={t.id} t={t} />) : <div className="py-4 text-center text-sm text-gray-400">{tr('Nothing completed yet')}</div>}</section>
                    </div>
                </div>
            </div>
        </Container>
    )
}

export default StaffProfile
