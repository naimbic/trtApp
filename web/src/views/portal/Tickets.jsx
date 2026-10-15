import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TbPlus, TbSend, TbPaperclip } from 'react-icons/tb'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Table from '@/components/ui/Table'
import classNames from '@/utils/classNames'
import { portal } from './api'
import { Empty } from './ui'
import { useI18n } from './i18n'

const { Tr, Th, Td, THead, TBody } = Table
const clean = (h) => String(h || '').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '').replace(/javascript:/gi, '')
const ini = (n = '') => n.split(/[\s·]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>

export const Tickets = () => {
    const { t, ago } = useI18n()
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [dialog, setDialog] = useState(false)
    const [v, setV] = useState({ subject: '', message: '', departmentId: null, priorityId: null })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => { portal('/tickets').then(setD).catch(() => setD({ list: [], departments: [], priorities: [] })) }, [])
    const opt = (l = []) => l.map((x) => ({ value: x.id, label: x.name }))
    const create = async () => {
        setBusy(true); setError('')
        try { const r = await portal('/tickets', { method: 'POST', body: v }); nav(`/portal/tickets/${r.id}`) } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3>{t('Support')}</h3><p className="text-sm text-gray-500">{t('Ask a question or report a problem. We answer here and by email.')}</p></div><Button variant="solid" icon={<TbPlus />} onClick={() => setDialog(true)}>{t('New request')}</Button></div>
            <Card bodyClass="p-0 sm:p-0">
                {!d ? <div className="p-6"><Skeleton height={120} /></div> : d.list.length ? (
                    <div className="overflow-x-auto"><Table hoverable><THead><Tr><Th>#</Th><Th>{t('Subject')}</Th><Th>{t('Department')}</Th><Th>{t('Status')}</Th><Th>{t('Last reply')}</Th></Tr></THead>
                        <TBody>{d.list.map((k) => (
                            <Tr key={k.id} className="cursor-pointer" onClick={() => nav(`/portal/tickets/${k.id}`)}>
                                <Td className="text-gray-500">{k.number}</Td><Td className={classNames('max-w-[360px] truncate', k.unread ? 'font-bold' : 'font-semibold')}>{k.subject}{k.unread && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-white">{t('new reply')}</span>}</Td><Td>{k.department || '—'}</Td>
                                <Td>{k.status && <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: k.status.color }} />{k.status.name}</span>}</Td><Td className="text-gray-500">{k.lastReply ? ago(k.lastReply) : t('No reply yet')}</Td>
                            </Tr>))}</TBody></Table></div>
                ) : <Empty>{t('You have no support requests yet.')}</Empty>}
            </Card>
            <Dialog isOpen={dialog} width={620} onClose={() => setDialog(false)} onRequestClose={() => setDialog(false)}>
                <h4>{t('New support request')}</h4>
                {error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                <div className="mt-4 space-y-4">
                    <div><L>{t('Subject')}</L><Input value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><L>{t('Department')}</L><Select isClearable options={opt(d?.departments)} value={opt(d?.departments).find((o) => o.value === v.departmentId) || null} onChange={(o) => setV({ ...v, departmentId: o?.value || null })} /></div>
                        <div><L>{t('Priority')}</L><Select isClearable options={opt(d?.priorities)} value={opt(d?.priorities).find((o) => o.value === v.priorityId) || null} onChange={(o) => setV({ ...v, priorityId: o?.value || null })} placeholder={t('Medium')} /></div>
                    </div>
                    <div><L>{t('Message')}</L><Input textArea rows={7} placeholder={t('Describe what you need or what went wrong')} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2"><Button onClick={() => setDialog(false)}>{t('Cancel')}</Button><Button variant="solid" loading={busy} disabled={!v.subject.trim() || !v.message.trim()} onClick={create}>{t('Send request')}</Button></div>
            </Dialog>
        </div>
    )
}

export const TicketThread = () => {
    const { t: tr, date } = useI18n()
    const { id } = useParams()
    const [d, setD] = useState(null)
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const end = useRef(null)
    const load = () => portal(`/tickets/${id}`).then(setD).catch((e) => setError(e.message))
    useEffect(() => { setD(null); load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (d) end.current?.scrollIntoView({ block: 'nearest' }) }, [d?.thread.length]) // eslint-disable-line react-hooks/exhaustive-deps
    if (error && !d) return <Card><div className="text-red-500">{error}</div><Link to="/portal/tickets" className="mt-3 inline-block text-primary">{tr('Back to support')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { ticket: t } = d
    const send = async () => { setBusy(true); setError(''); try { await portal(`/tickets/${id}/reply`, { method: 'POST', body: { message: text } }); setText(''); await load() } catch (e) { setError(e.message) } finally { setBusy(false) } }
    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-700"><div className="mb-1 text-sm text-gray-500"><Link to="/portal/tickets" className="hover:text-primary">{tr('Support')}</Link> · #{t.number}</div><h3 className="break-words">{t.subject}</h3><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">{t.status && <span className="inline-flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200"><span className="h-2 w-2 rounded-full" style={{ background: t.status.color }} />{t.status.name}</span>}<span>{tr('Opened {date}', { date: date(t.createdAt, 'DD MMM YYYY, HH:mm') })}</span></div></div>
            <div className="space-y-4">
                {d.thread.map((m) => (
                    <div key={m.id} className={classNames('flex gap-3', !m.staff && 'flex-row-reverse')}>
                        <Avatar size={36} shape="circle" className={m.staff ? '' : 'bg-primary text-white'}>{ini(m.name)}</Avatar>
                        <div className={classNames('max-w-[88%] rounded-2xl p-4', m.staff ? 'rounded-tl-sm bg-gray-100 dark:bg-gray-700/50' : 'rounded-tr-sm bg-primary/10 dark:bg-primary/20')}>
                            <div className="mb-2 flex items-center justify-between gap-4 text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{m.name}</span><span>{date(m.date, 'DD MMM YYYY, HH:mm')}</span></div>
                            <div className="prose prose-sm max-w-none break-words dark:prose-invert [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: clean(m.html) }} />
                            {m.attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{m.attachments.map((a) => <span key={a.id} className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-xs"><TbPaperclip />{a.name}</span>)}</div>}
                        </div>
                    </div>
                ))}
                <div ref={end} />
            </div>
            <Card className="mt-6">
                <h5 className="mb-3">{t.closed ? tr('Reply to reopen this request') : tr('Reply')}</h5>
                {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                <Input textArea rows={5} placeholder={tr('Write your message')} value={text} onChange={(e) => setText(e.target.value)} />
                <div className="mt-3 flex justify-end"><Button variant="solid" icon={<TbSend />} loading={busy} disabled={!text.trim()} onClick={send}>{tr('Send reply')}</Button></div>
            </Card>
        </div>
    )
}
