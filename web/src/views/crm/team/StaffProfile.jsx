/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import dayjs from 'dayjs'
import { TbUserShare, TbArrowLeft, TbChecklist, TbAlertTriangle, TbCircleCheck, TbClock, TbMail, TbPhone, TbBrandWhatsapp, TbPencil, TbHistory, TbShieldLock, TbLockPassword, TbLink, TbKey, TbLogout, TbDeviceMobileOff, TbDots } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Switcher from '@/components/ui/Switcher'
import Dropdown from '@/components/ui/Dropdown'
import Tooltip from '@/components/ui/Tooltip'
import { useSessionUser } from '@/store/authStore'
import SalaryCard from './SalaryCard'
import MemberDrawer from './MemberDrawer'
import MemberAccessDrawer from './MemberAccessDrawer'
import { useMemberActions, api as teamApi, notify as teamNotify } from './MemberActions'
import { loginAs } from '@/components/crm/LoginAsBanner'
import ScoreRing from '@/components/crm/ScoreRing'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { api, useCan } from '../kit/api'
import { hm, WorkDays, WorkChart } from './WorkHours'
import { tr } from '@/utils/t'

/** Round quick action with a tooltip (same as the customer card). */
const Act = ({ icon, label, onClick }) => <Tooltip title={label}><button type="button" className="cx-ibtn" aria-label={label} onClick={onClick}>{icon}</button></Tooltip>

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
    const can = useCan()
    const authority = useSessionUser((s) => s.user.authority) || []
    const canAdmin = authority.includes('admin') || authority.includes('crm.admin')
    const canEdit = can('staff', 'edit')
    const canLoginAs = canAdmin || authority.includes('crm.staff.login_as')
    const canActivity = canAdmin || authority.includes('crm.activity_log.view')
    const [lookups, setLookups] = useState({ roles: [], departments: [] })
    const [drawer, setDrawer] = useState(false)
    const [access, setAccess] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const load = useCallback(() => api(`/api/crm/team/${id}`).then(setD).catch((e) => setError(e.message)), [id])
    const { setConfirm, setSetPw, dialogs } = useMemberActions({ reload: load })
    useEffect(() => { load() }, [load])
    useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t) }, [load]) // the online dot stays current
    useEffect(() => { if (canEdit) api('/api/crm/team/lookups').then(setLookups).catch(() => {}) }, [canEdit])
    const toggleActive = async (checked) => {
        setD((x) => ({ ...x, member: { ...x.member, active: checked } }))
        try {
            await teamApi(`/api/crm/team/${id}`, { method: 'PATCH', body: JSON.stringify({ active: checked }) })
            teamNotify('success', checked ? tr('{name} activated', { name: d.member.name }) : tr('{name} deactivated', { name: d.member.name }))
            load()
        } catch (e) { teamNotify('danger', e.message); load() }
    }
    const submit = async (v) => {
        setSaving(true); setFormError('')
        try {
            await teamApi(`/api/crm/team/${id}`, { method: 'PATCH', body: JSON.stringify(v) })
            teamNotify('success', tr('Member updated'))
            setDrawer(false); load()
        } catch (e) { setFormError(e.message) } finally { setSaving(false) }
    }
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
            <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary" data-href={'/crm/staff'} onClick={() => navigate('/crm/staff')}><TbArrowLeft />{tr('Team')}</button>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[340px_1fr]">
                <div className="pt-col pt-col--sticky">
                    <section className="pt-card pt-prof relative">
                        {canEdit && <div className="absolute right-4 top-4"><Tooltip title={m.active ? tr('Active') : tr('Inactive: switch on to edit this member')}><span><Switcher checked={m.active} onChange={toggleActive} /></span></Tooltip></div>}
                        <div className={m.active ? undefined : 'opacity-60 grayscale'}>
                            <div className="mb-2 flex justify-center">
                                <ScoreRing score={s} size={116} width={6} badge>
                                    <Avatar shape="circle" size={102} {...(m.image ? { src: m.image } : {})}>{m.image ? null : initials(m)}</Avatar>
                                </ScoreRing>
                            </div>
                            <h2 className="pt-name flex items-center justify-center gap-2">
                                <span className={`inline-block size-2.5 shrink-0 rounded-full ${m.online ? 'bg-emerald-500' : 'bg-gray-300'}`} style={m.online ? { boxShadow: '0 0 0 3px rgba(16,185,129,.22), 0 0 10px 2px rgba(16,185,129,.75)' } : undefined} title={m.online ? tr('Online') : m.lastSeen ? tr('Offline · last seen {when}', { when: dayjs(m.lastSeen).format('DD MMM, HH:mm') }) : tr('Offline')} />
                                <span className="min-w-0 truncate">{m.name}</span>
                            </h2>
                            {(m.jobTitle || m.departments.length > 0) && <p className="pt-role">{[m.jobTitle, ...m.departments.map((x) => x.name)].filter(Boolean).join(' · ')}</p>}
                            {(m.admin || m.role?.name) && <div className="mt-1.5 flex justify-center"><span className={`rounded-md px-2.5 py-1 text-xs font-bold ${m.admin ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>{m.admin ? tr('Super Admin') : m.role.name}</span></div>}
                            <div className="pt-acts">
                                {m.email && <a className="pt-act" href={`mailto:${m.email}`}><TbMail />{tr('Email')}</a>}
                                {phone && <a className="pt-act" href={`tel:${phone.replace(/\s/g, '')}`}><TbPhone />{tr('Call')}</a>}
                                {(m.whatsapp || phone) && <a className="pt-act" href={`https://wa.me/${(m.whatsapp || phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"><TbBrandWhatsapp />{tr('WhatsApp')}</a>}
                            </div>
                            <div className={`mt-2.5 flex flex-wrap justify-center gap-1.5 ${m.active ? '' : 'pointer-events-none'}`} aria-disabled={!m.active}>
                                {canEdit && <Act icon={<TbPencil />} label={tr('Edit')} onClick={() => { setFormError(''); setDrawer(true) }} />}
                                {canActivity && <Act icon={<TbHistory />} label={tr('Activity log')} data-href={`/crm/activity/staff/${m.id}`} onClick={() => navigate(`/crm/activity/staff/${m.id}`)} />}
                                {canLoginAs && m.hasLogin && <Act icon={<TbUserShare />} label={tr('Log in as this member')} onClick={() => loginAs(m.id).catch((e) => teamNotify('danger', e.message))} />}
                                {canEdit && <Act icon={<TbShieldLock />} label={tr('Permissions')} onClick={() => setAccess(true)} />}
                                {canEdit && m.hasLogin && <Act icon={<TbLockPassword />} label={tr('Set a password')} onClick={() => setSetPw({ member: m, value: '', saving: false, error: '' })} />}
                                {(canEdit && m.hasLogin) || (canAdmin && m.twoFactor) ? (
                                    <Dropdown placement="bottom-end" renderTitle={<button type="button" className="cx-ibtn" aria-label={tr('More')}><TbDots /></button>}>
                                        {canEdit && m.hasLogin && <Dropdown.Item eventKey="link" onClick={() => setConfirm({ member: m, kind: 'link' })}><TbLink className="mr-2 text-lg" />{tr('Reset link')}</Dropdown.Item>}
                                        {canEdit && m.hasLogin && <Dropdown.Item eventKey="reset" onClick={() => setConfirm({ member: m, kind: 'reset' })}><TbKey className="mr-2 text-lg" />{tr('One-time password')}</Dropdown.Item>}
                                        {canEdit && m.hasLogin && <Dropdown.Item eventKey="signout" onClick={() => setConfirm({ member: m, kind: 'signout' })}><TbLogout className="mr-2 text-lg" />{tr('Sign out everywhere')}</Dropdown.Item>}
                                        {canAdmin && m.twoFactor && <Dropdown.Item eventKey="twofactor" onClick={() => setConfirm({ member: m, kind: 'twofactor' })}><TbDeviceMobileOff className="mr-2 text-lg" />{tr('Reset two-step verification')}</Dropdown.Item>}
                                    </Dropdown>
                                ) : null}
                            </div>
                            <dl className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-left text-[13px] dark:border-gray-700">
                                <div className="flex justify-between gap-3"><dt className="text-gray-400">{tr('Hire date')}</dt><dd className="font-semibold">{m.hireDate ? dayjs(m.hireDate).format('DD MMM YYYY') : '–'}</dd></div>
                                {m.fireDate && <div className="flex justify-between gap-3"><dt className="text-gray-400">{tr('Fire date')}</dt><dd className="font-semibold text-red-500">{dayjs(m.fireDate).format('DD MMM YYYY')}</dd></div>}
                                {canAdmin && <div className="flex justify-between gap-3"><dt className="text-gray-400">{tr('CNSS')}</dt><dd className="font-semibold">{m.cnss ? tr('Declared') : tr('Not declared')}</dd></div>}
                                {canAdmin && (
                                    <div className="flex items-center justify-between gap-3">
                                        <dt className="text-gray-400">{tr('RIB')}</dt>
                                        <dd className="flex min-w-0 items-center gap-2 font-semibold">
                                            <span className="select-all truncate tracking-wide">{m.rib || '–'}</span>
                                            {m.rib && <button type="button" className="shrink-0 text-xs font-semibold text-primary hover:underline" onClick={() => navigator.clipboard?.writeText(m.rib).then(() => teamNotify('success', tr('Copied')), () => {})}>{tr('Copy')}</button>}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            <p className="mt-3 border-t border-gray-100 pt-3 text-center text-[11px] leading-tight text-gray-500 dark:border-gray-700">
                                {m.email && <>{tr('Email')} : <span className="font-semibold text-gray-700 dark:text-gray-300">{m.email}</span></>}
                                {m.email && m.lastLogin && ' - '}
                                {m.lastLogin && <>{tr('Last login')} : <span className="font-semibold text-gray-700 dark:text-gray-300">{dayjs(m.lastLogin).format('DD MMM YYYY, HH:mm')}</span></>}
                            </p>
                        </div>
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
                    {canAdmin && <SalaryCard staffId={id} name={m.name} />}
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
            <MemberAccessDrawer open={access} memberId={id} onClose={() => setAccess(false)} onSaved={load} />
            <MemberDrawer open={drawer} member={m} lookups={lookups} canAdmin={canAdmin} saving={saving} error={formError} onSubmit={submit} onClose={() => setDrawer(false)} onChanged={load} />
            {dialogs}
        </Container>
    )
}

export default StaffProfile
