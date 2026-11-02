import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TbPlus, TbSend, TbSearch, TbInbox, TbMessageCircle, TbCircleCheck, TbRefresh, TbStar, TbStarFilled, TbPaperclip, TbRobot, TbBuilding, TbFlag, TbClock, TbUser, TbBriefcase } from 'react-icons/tb'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import RichEditor from '@/components/crm/RichEditor'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import classNames from '@/utils/classNames'
import { portal, portalUpload } from './api'
import { useTicketFiles, AttachButtons, FileTray, DropHint, AttachmentList, messageForm } from '@/components/crm/TicketFiles'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { Empty } from './ui'
import { useI18n } from './i18n'
import { usePortal } from './PortalApp'

const clean = (h) => String(h || '').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '').replace(/javascript:/gi, '')
const ini = (n = '') => n.split(/[\s·]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const warn = (type, text) => toast.push(<Notification type={type}>{text}</Notification>, { placement: 'top-center' })
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const PRIO = (n = '') => (/high|urgent/i.test(n) ? 'bg-red-100 text-red-700' : /low/i.test(n) ? 'bg-gray-100 text-gray-600' : 'bg-sky-100 text-sky-700')

const StatusPill = ({ s }) => (s ? <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `${s.color}22`, color: s.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />{s.name}</span> : null)
const Chip = ({ children, className = '' }) => (children ? <span className={classNames('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', className || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{children}</span> : null)

const Stars = ({ value = 0, onPick, size = 'text-2xl' }) => (
    <span className="inline-flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" disabled={!onPick} onClick={() => onPick?.(n)} aria-label={`${n}`} className={classNames(size, n <= value ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600', onPick && 'transition hover:scale-110')}>{n <= value ? <TbStarFilled /> : <TbStar />}</button>
        ))}
    </span>
)

/** The support requests of the client: counters that filter, a search, and one card per request. */
export const Tickets = () => {
    const { t, ago } = useI18n()
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [dialog, setDialog] = useState(false)
    const [filter, setFilter] = useState('all')
    const [query, setQuery] = useState('')
    const [v, setV] = useState({ subject: '', message: '', departmentId: null, priorityId: null })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const tf = useTicketFiles({ notify: warn, t })
    useEffect(() => { portal('/tickets').then(setD).catch(() => setD({ list: [], departments: [], priorities: [] })) }, [])
    const opt = (l = []) => l.map((x) => ({ value: x.id, label: x.name }))
    const create = async () => {
        setBusy(true); setError('')
        try { const r = await portalUpload('/tickets', messageForm(v, tf.files)); tf.clear(); nav(`/portal/tickets/${r.id}`) } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    const list = d?.list || []
    const counts = useMemo(() => ({ all: list.length, open: list.filter((k) => !k.status?.closed).length, wait: list.filter((k) => k.answered && !k.status?.closed).length, closed: list.filter((k) => k.status?.closed).length }), [list])
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase().replace('#', '')
        return list.filter((k) => (filter === 'all' || (filter === 'open' && !k.status?.closed) || (filter === 'wait' && k.answered && !k.status?.closed) || (filter === 'closed' && k.status?.closed)) && (!q || `${k.number} ${k.subject} ${k.department}`.toLowerCase().includes(q)))
    }, [list, filter, query])
    const tabs = [['all', t('All'), counts.all], ['open', t('Open'), counts.open], ['wait', t('Waiting for you'), counts.wait], ['closed', t('Closed'), counts.closed]]
    const stat = (key, icon, label, tone) => (
        <button type="button" onClick={() => setFilter(key)} className={classNames('flex items-center gap-4 rounded-2xl border p-5 text-start transition', filter === key ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white hover:border-primary/40 dark:border-gray-700 dark:bg-gray-800')}>
            <span className={classNames('flex h-11 w-11 items-center justify-center rounded-xl text-2xl', tone)}>{icon}</span>
            <span><span className="block text-3xl font-bold leading-none heading-text">{counts[key]}</span><span className="text-sm text-gray-500">{label}</span></span>
        </button>
    )
    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3>{t('Support')}</h3><p className="text-sm text-gray-500">{t('Ask a question or report a problem. We answer here and by email.')}</p></div><Button variant="solid" icon={<TbPlus />} onClick={() => setDialog(true)}>{t('New request')}</Button></div>
            {!d ? <Card><Skeleton height={160} /></Card> : (
                <>
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                        {stat('open', <TbInbox />, t('Open requests'), 'bg-sky-100 text-sky-600')}
                        {stat('wait', <TbMessageCircle />, t('Waiting for you'), 'bg-amber-100 text-amber-600')}
                        {stat('closed', <TbCircleCheck />, t('Closed'), 'bg-emerald-100 text-emerald-600')}
                    </div>
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <div className="w-full sm:w-72"><Input prefix={<TbSearch />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search a request')} /></div>
                        <div className="flex flex-wrap gap-1.5">{tabs.map(([k, label, n]) => <button key={k} type="button" onClick={() => setFilter(k)} className={classNames('rounded-full px-3 py-1.5 text-sm font-semibold transition', filter === k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300')}>{label} <span className="opacity-70">{n}</span></button>)}</div>
                    </div>
                    {shown.length ? (
                        <div className="flex flex-col gap-3">
                            {shown.map((k) => (
                                <Link key={k.id} to={`/portal/tickets/${k.id}`} className="group flex items-stretch overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-primary/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                                    <span className="w-1.5 shrink-0" style={{ background: k.status?.color || '#94a3b8' }} />
                                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3 p-5">
                                        <span className="min-w-0 flex-1 basis-64">
                                            <span className="mb-1 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-gray-400">#{k.number}</span><StatusPill s={k.status} />{k.answered && !k.status?.closed && <Chip className="bg-amber-100 text-amber-700"><TbMessageCircle />{t('Waiting for you')}</Chip>}{k.unread && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">{t('new reply')}</span>}</span>
                                            <span className={classNames('block truncate text-lg group-hover:text-primary', k.unread ? 'font-bold' : 'font-semibold')}>{k.subject}</span>
                                            <span className="mt-1.5 flex flex-wrap items-center gap-2">{k.priority && <Chip className={PRIO(k.priority)}><TbFlag />{k.priority}</Chip>}{k.department && <Chip><TbBuilding />{k.department}</Chip>}{k.rating ? <Chip className="bg-amber-50 text-amber-600"><TbStarFilled />{k.rating}/5</Chip> : null}</span>
                                        </span>
                                        <span className="shrink-0 text-end text-xs text-gray-500"><span className="flex items-center justify-end gap-1"><TbClock />{k.lastReply ? ago(k.lastReply) : t('No reply yet')}</span><span className="mt-0.5 block text-gray-400">{t('Opened {date}', { date: ago(k.createdAt) })}</span></span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : <Card><Empty>{list.length ? t('No request matches.') : t('You have no support requests yet.')}</Empty></Card>}
                </>
            )}
            <Dialog isOpen={dialog} width={620} onClose={() => setDialog(false)} onRequestClose={() => setDialog(false)}>
                <h4>{t('New support request')}</h4>
                {error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                <div className="mt-4 space-y-4">
                    <div><L>{t('Subject')}</L><Input value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><L>{t('Department')}</L><Select isClearable options={opt(d?.departments)} value={opt(d?.departments).find((o) => o.value === v.departmentId) || null} onChange={(o) => setV({ ...v, departmentId: o?.value || null })} /></div>
                        <div><L>{t('Priority')}</L>
                            <div className="flex flex-wrap gap-2">{(d?.priorities || []).map((p) => <button key={p.id} type="button" onClick={() => setV({ ...v, priorityId: v.priorityId === p.id ? null : p.id })} className={classNames('rounded-full border px-3 py-1.5 text-sm font-semibold transition', v.priorityId === p.id ? `${PRIO(p.name)} border-transparent ring-2 ring-primary/40` : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700')}>{p.name}</button>)}</div>
                        </div>
                    </div>
                    <div className="relative" {...tf.dropProps}><DropHint tf={tf} t={t} /><L>{t('Message')}</L><div onPaste={tf.onPaste}><RichEditor mentions={false} images={false} minHeight={150} placeholder={t('Describe what you need or what went wrong')} value={v.message} onChange={(h) => setV({ ...v, message: h })} /></div><p className="mt-1 text-xs text-gray-400">{t('Paste a screenshot (Ctrl+V) or drop files here.')}</p><FileTray tf={tf} t={t} /><div className="mt-2"><AttachButtons tf={tf} t={t} size="sm" /></div></div>
                </div>
                <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setDialog(false)}>{t('Cancel')}</Button><Button variant="solid" loading={busy} disabled={!v.subject.trim() || !v.message.trim()} onClick={create}>{t('Send request')}</Button></div>
            </Dialog>
        </div>
    )
}

/** One request: the conversation on the left, the details, the files and the satisfaction on the right. */
export const TicketThread = () => {
    const { t: tr, date, ago } = useI18n()
    const { reload } = usePortal()
    const tf = useTicketFiles({ notify: warn, t: tr })
    const { id } = useParams()
    const [d, setD] = useState(null)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [stars, setStars] = useState(0)
    const [comment, setComment] = useState('')
    const end = useRef(null)
    const load = () => portal(`/tickets/${id}`).then((x) => { setD(x); reload() }).catch((e) => setError(e.message)) // reading it clears the unread badge
    useEffect(() => { setD(null); load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (d) end.current?.scrollIntoView({ block: 'nearest' }) }, [d?.thread.length]) // eslint-disable-line react-hooks/exhaustive-deps
    if (error && !d) return <Card><div className="text-red-500">{error}</div><Link to="/portal/tickets" className="mt-3 inline-block text-primary">{tr('Back to support')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { ticket: t } = d
    const act = async (action, extra = {}) => { setBusy(true); setError(''); try { await portal(`/tickets/${id}/close`, { method: 'POST', body: { action, ...extra } }); await load() } catch (e) { setError(e.message) } finally { setBusy(false) } }
    const send = async () => { setBusy(true); setError(''); try { await portalUpload(`/tickets/${id}/reply`, messageForm({ message: text }, tf.files)); setText(''); tf.clear(); await load() } catch (e) { setError(e.message) } finally { setBusy(false) } }
    const row = (icon, label, value) => (value ? <div className="flex items-start gap-2.5 text-sm"><span className="mt-0.5 text-lg text-gray-400">{icon}</span><span><span className="block text-xs text-gray-400">{label}</span><span className="font-semibold">{value}</span></span></div> : null)
    return (
        <div className="w-full">
            <div className="mb-5">
                <div className="mb-1 text-sm text-gray-500"><Link to="/portal/tickets" className="hover:text-primary">{tr('Support')}</Link> · #{t.number}</div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0"><h2 className="break-words">{t.subject}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><StatusPill s={t.status} />{t.priority && <Chip className={PRIO(t.priority)}><TbFlag />{t.priority}</Chip>}{t.department && <Chip><TbBuilding />{t.department}</Chip>}{t.project && <Chip><TbBriefcase />{t.project}</Chip>}</div></div>
                    {t.closed ? <Button icon={<TbRefresh />} loading={busy} onClick={() => act('reopen')}>{tr('Reopen this request')}</Button> : <Button icon={<TbCircleCheck />} loading={busy} onClick={() => act('close')}>{tr('Close this request')}</Button>}
                </div>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="min-w-0 flex-1">
                    <div className="space-y-4">
                        {d.thread.map((m) => (
                            <div key={m.id} className={classNames('flex gap-3', !m.staff && 'flex-row-reverse')}>
                                <Avatar size={42} shape="circle" className={m.staff ? '' : 'bg-primary text-white'}>{m.auto ? <TbRobot /> : ini(m.name)}</Avatar>
                                <div className={classNames('max-w-[85%] rounded-2xl p-5', m.staff ? 'rounded-tl-sm bg-gray-100 dark:bg-gray-700/50' : 'rounded-tr-sm bg-primary/10 dark:bg-primary/20')}>
                                    <div className="mb-2 flex items-center justify-between gap-4 text-sm text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{m.name}{m.auto && <span className="ms-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-600">{tr('automatic message')}</span>}</span><span>{date(m.date, 'DD MMM YYYY, HH:mm')}</span></div>
                                    <div className="prose max-w-none break-words text-[15px] dark:prose-invert [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: clean(m.html) }} />
                                    <AttachmentList items={m.attachments} t={tr} />
                                </div>
                            </div>
                        ))}
                        <div ref={end} />
                    </div>
                    <div className="relative mt-6" {...tf.dropProps}>
                        <DropHint tf={tf} t={tr} />
                        <Card>
                            <h5 className="mb-3">{t.closed ? tr('Reply to reopen this request') : tr('Reply')}</h5>
                            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                            <div onPaste={tf.onPaste}><RichEditor mentions={false} images={false} minHeight={120} placeholder={tr('Write your message')} value={text} onChange={setText} /></div>
                            <p className="mt-1 text-xs text-gray-400">{tr('Paste a screenshot (Ctrl+V) or drop files here.')}</p>
                            <FileTray tf={tf} t={tr} />
                            <div className="mt-3 flex items-center justify-between gap-3"><AttachButtons tf={tf} t={tr} /><Button variant="solid" icon={<TbSend />} loading={busy} disabled={!text.trim() && !tf.items.length} onClick={send}>{tr('Send reply')}</Button></div>
                        </Card>
                    </div>
                </div>
                <div className="space-y-4 lg:w-[340px] lg:shrink-0 xl:w-[400px]">
                    <Card>
                        <h5 className="mb-4">{tr('Details')}</h5>
                        <div className="space-y-4">
                            {row(<TbClock />, tr('Opened'), date(t.createdAt, 'DD MMM YYYY, HH:mm'))}
                            {row(<TbMessageCircle />, tr('Last reply'), t.lastReply ? ago(t.lastReply) : tr('No reply yet'))}
                            {row(<TbUser />, tr('Handled by'), t.agent)}
                            {row(<TbBuilding />, tr('Department'), t.department)}
                            {row(<TbFlag />, tr('Priority'), t.priority)}
                            {row(<TbBriefcase />, tr('Project'), t.project)}
                        </div>
                    </Card>
                    {d.files?.length > 0 && (
                        <Card>
                            <h5 className="mb-3 flex items-center gap-2"><TbPaperclip />{tr('Files')} <span className="text-sm font-normal text-gray-400">{d.files.length}</span></h5>
                            <AttachmentList items={d.files} t={tr} />
                        </Card>
                    )}
                    {t.closed && (
                        <Card>
                            <h5 className="mb-2">{tr('How did we do?')}</h5>
                            {t.rating ? (
                                <div><Stars value={t.rating} /><p className="mt-2 text-sm text-gray-500">{tr('Thank you for your feedback.')}</p>{t.ratingComment && <p className="mt-1 text-sm italic text-gray-500">“{t.ratingComment}”</p>}</div>
                            ) : (
                                <div>
                                    <Stars value={stars} onPick={setStars} />
                                    <Input className="mt-3" textArea rows={2} placeholder={tr('Add a comment (optional)')} value={comment} onChange={(e) => setComment(e.target.value)} />
                                    <Button className="mt-3" size="sm" variant="solid" loading={busy} disabled={!stars} onClick={() => act('rate', { rating: stars, comment })}>{tr('Send my rating')}</Button>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
