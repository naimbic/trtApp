import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TbBug, TbPlug, TbAdjustments, TbHelpCircle, TbFlag, TbPlus, TbMessageCircle, TbPaperclip, TbTrash, TbExternalLink, TbRefresh } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import { CommentTools, CommentEdit, ReplyQuote, ReplyingTo } from '@/components/crm/CommentParts'
import Skeleton from '@/components/ui/Skeleton'
import { portal, portalUpload } from './api'
import { Empty } from './ui'
import { useI18n } from './i18n'
import { usePortal } from './PortalApp'

const ICON = { bug: <TbBug />, integration: <TbPlug />, change: <TbAdjustments />, question: <TbHelpCircle />, other: <TbFlag /> }
const TYPE = { bug: 'Error or bug', integration: 'Code integration', change: 'Change or improvement', question: 'Question', other: 'Other' }
const PRIO = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
const STATUS = { new: 'New', reviewing: 'Under review', planned: 'Planned', doing: 'In progress', testing: 'Testing', waiting: 'Waiting for you', done: 'Done', declined: 'Declined' }
const TONE = { new: 'bg-blue-100 text-blue-700', reviewing: 'bg-violet-100 text-violet-700', planned: 'bg-sky-100 text-sky-700', doing: 'bg-amber-100 text-amber-700', testing: 'bg-fuchsia-100 text-fuchsia-700', waiting: 'bg-orange-100 text-orange-700', done: 'bg-green-100 text-green-700', declined: 'bg-gray-200 text-gray-600' }
const Pill = ({ status, t }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status]}`}>{t(STATUS[status])}</span>

/** The form to send a request: what kind, what is wrong or needed, where, a screenshot. */
const NewRequest = ({ open, onClose, onSent }) => {
    const { t } = useI18n()
    const [v, setV] = useState({ title: '', body: '', type: 'bug', priority: 2, url: '', attachments: [] })
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => { if (open) { setV({ title: '', body: '', type: 'bug', priority: 2, url: '', attachments: [] }); setError('') } }, [open])
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const addFiles = async (files) => {
        setBusy(true); setError('')
        try { const got = []; for (const f of files) { const fd = new FormData(); fd.append('file', f); got.push(await portalUpload('/requests/upload', fd)) } set({ attachments: [...v.attachments, ...got].slice(0, 10) }) } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    const send = async () => {
        if (!v.title.trim()) return setError(t('Give your request a title'))
        setBusy(true); setError('')
        try { const r = await portal('/requests', { method: 'POST', body: v }); onSent(r.request) } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} onClose={onClose} onRequestClose={onClose} width={640}>
            <h5 className="mb-3">{t('New request')}</h5>
            <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
                <div><label className="mb-1 block text-xs font-semibold text-gray-500">{t('Kind of request')}</label><div className="flex flex-wrap gap-1.5">{Object.keys(TYPE).map((k) => <button key={k} type="button" onClick={() => set({ type: k })} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ring-1 transition ${v.type === k ? 'bg-primary text-white ring-primary' : 'bg-white text-gray-600 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600'}`}>{ICON[k]}{t(TYPE[k])}</button>)}</div></div>
                <div><label className="mb-1 block text-xs font-semibold text-gray-500">{t('Title')}</label><Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder={t('What is wrong, or what do you need?')} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-gray-500">{t('Details: steps to reproduce, what you expected, what to integrate')}</label><RichEditor mentions={false} images={false} minHeight={130} value={v.body} onChange={(html) => set({ body: html })} placeholder={t('Describe it so that someone who was not there can understand')} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div><label className="mb-1 block text-xs font-semibold text-gray-500">{t('Page address or website')}</label><Input value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" /></div>
                    <div><label className="mb-1 block text-xs font-semibold text-gray-500">{t('How urgent is it?')}</label><div className="flex gap-1.5">{Object.entries(PRIO).map(([k, l]) => <button key={k} type="button" onClick={() => set({ priority: +k })} className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition ${v.priority === +k ? 'bg-primary text-white ring-primary' : 'bg-white text-gray-600 ring-gray-200 dark:bg-gray-800 dark:ring-gray-600'}`}>{t(l)}</button>)}</div></div>
                </div>
                <div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600"><TbPaperclip />{t('Add a screenshot or a file')}<input type="file" multiple hidden onChange={(e) => { addFiles([...e.target.files]); e.target.value = '' }} /></label>
                    <div className="mt-2 space-y-1">{v.attachments.map((a) => <div key={a.url} className="flex items-center gap-2 text-sm">{a.kind === 'image' ? <img src={a.url} alt="" className="size-9 rounded object-cover" /> : <TbPaperclip className="text-gray-400" />}<span className="min-w-0 flex-1 truncate">{a.name}</span><button type="button" aria-label={t('Remove')} onClick={() => set({ attachments: v.attachments.filter((x) => x.url !== a.url) })} className="text-gray-400 hover:text-red-500"><TbTrash /></button></div>)}</div>
                </div>
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            </div>
            <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>{t('Cancel')}</Button><Button variant="solid" loading={busy} onClick={send}>{t('Send the request')}</Button></div>
        </Dialog>
    )
}

export const Requests = () => {
    const { t, date } = useI18n()
    const nav = useNavigate()
    const { me } = usePortal()
    const [d, setD] = useState(null)
    const [open, setOpen] = useState(false)
    useEffect(() => { portal('/requests').then(setD).catch(() => setD({ list: [] })) }, [])
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div><h3>{t('Requests')}</h3><p className="text-sm text-gray-500">{t('Report an error, ask for a code integration or a change, or ask a question. You follow each request here.')}</p></div>
                {!me.preview && <Button variant="solid" icon={<TbPlus />} onClick={() => setOpen(true)}>{t('New request')}</Button>}
            </div>
            {d?.waiting > 0 && <div className="mb-4 rounded-xl bg-orange-50 px-4 py-2.5 text-sm text-orange-700">{t('{n} request(s) are waiting for your answer.', { n: d.waiting })}</div>}
            {!d ? <Card><Skeleton height={120} /></Card> : d.list.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {d.list.map((r) => (
                        <Card key={r.id} bodyClass="h-full">
                            <Link to={`/portal/requests/${r.id}`} className="flex h-full flex-col gap-2">
                                <div className="flex items-center justify-between gap-2 text-xs text-gray-500"><span className="inline-flex items-center gap-1 font-semibold">{ICON[r.type]}{r.code} · {t(TYPE[r.type])}</span><Pill status={r.status} t={t} /></div>
                                <h6 className="font-bold leading-snug hover:text-primary">{r.title}</h6>
                                <div className="mt-auto flex items-center justify-between text-xs text-gray-400"><span>{t(PRIO[r.priority])}</span><span>{date(r.updatedAt, 'DD MMM')}</span></div>
                            </Link>
                        </Card>
                    ))}
                </div>
            ) : <Card><Empty>{t('No request yet. Use “New request” to send one.')}</Empty></Card>}
            <NewRequest open={open} onClose={() => setOpen(false)} onSent={(r) => { setOpen(false); nav(`/portal/requests/${r.id}`) }} />
        </div>
    )
}

export const RequestDetail = () => {
    const { t, date } = useI18n()
    const { id } = useParams()
    const { me } = usePortal()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [text, setText] = useState('')
    const [busy, setBusy] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const load = () => portal(`/requests/${id}`).then(setD).catch((e) => setError(e.message))
    useEffect(() => { load() }, [id])
    if (error) return <Card><div className="text-red-500">{error}</div><Link to="/portal/requests" className="mt-3 inline-block text-primary">{t('Back to requests')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { request: r } = d
    const ro = !!me.preview
    const act = async (body, key) => { setBusy(key); try { await portal(`/requests/${id}`, { method: 'POST', body }); setText(''); setReplyTo(null); await load() } catch (e) { setError(e.message) } finally { setBusy('') } }
    const send = () => text.replace(/<[^>]*>/g, '').trim() && act({ action: 'comment', body: text, replyToId: replyTo?.id }, 'say')
    return (
        <div className="flex flex-col gap-4">
            <div><div className="mb-1 text-sm text-gray-500"><Link to="/portal/requests" className="hover:text-primary">{t('Requests')}</Link></div><div className="flex flex-wrap items-center gap-3"><h3 className="flex items-center gap-2"><span className="text-fuchsia-500">{ICON[r.type]}</span>{r.title}</h3><Pill status={r.status} t={t} /></div></div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <h5 className="mb-3">{t('The request')}</h5>
                    {r.body ? <RichView mentions={false} html={r.body} /> : <p className="text-gray-500">—</p>}
                    {r.attachments.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{r.attachments.map((a) => a.kind === 'image' ? <a key={a.url} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name} className="h-24 rounded-lg object-cover" /></a> : <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-700"><TbPaperclip />{a.name}</a>)}</div>}
                </Card>
                <Card bordered={false} className="bg-gray-100 shadow-none dark:bg-gray-800">
                    <h5>{t('At a glance')}</h5>
                    <div className="mt-4 flex flex-col gap-3 text-sm">
                        <div><span className="font-semibold heading-text">{t('Reference')}: </span>{r.code}</div>
                        <div><span className="font-semibold heading-text">{t('Kind of request')}: </span>{t(TYPE[r.type])}</div>
                        <div><span className="font-semibold heading-text">{t('Priority')}: </span>{t(PRIO[r.priority])}</div>
                        <div><span className="font-semibold heading-text">{t('Sent')}: </span>{date(r.createdAt)}{r.createdByName ? ` · ${r.createdByName}` : ''}</div>
                        {r.dueDate && <div><span className="font-semibold heading-text">{t('Planned for')}: </span>{date(r.dueDate)}</div>}
                        {r.url && <a href={r.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 truncate text-primary hover:underline"><TbExternalLink className="shrink-0" />{r.url}</a>}
                    </div>
                </Card>
            </div>
            <Card>
                <h5 className="mb-3"><TbMessageCircle className="me-1 inline" />{t('Follow-up')}</h5>
                <div className="space-y-3">
                    {d.comments.map((c) => c.system ? <div key={c.id} className="text-center text-xs text-gray-400">{t('Status')}: <b>{t(STATUS[c.system.from] || c.system.from)}</b> → <b>{t(STATUS[c.system.to] || c.system.to)}</b> · {date(c.createdAt, 'DD MMM HH:mm')}</div> : (
                        <div key={c.id} className={`group relative flex gap-2.5 ${c.mine ? 'flex-row-reverse' : ''}`}>
                            <div className={`min-w-0 max-w-[88%] flex-1 rounded-xl p-3 text-sm ${c.mine ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
                                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="truncate">{c.mine ? t('You') : c.authorName || t('Our team')}</b><span className="ms-auto shrink-0">{date(c.createdAt, 'DD MMM HH:mm')}{c.edited ? ` · ${t('edited')}` : ''}</span></div>
                                <ReplyQuote r={c.replyTo} />
                                {editingId === c.id ? <CommentEdit plain initial={c.body} onCancel={() => setEditingId(null)} onSave={async (b) => { await act({ action: 'edit', commentId: c.id, body: b }, 'edit'); setEditingId(null) }} /> : <RichView mentions={false} html={c.body} />}
                            </div>
                            {!ro && editingId !== c.id && <CommentTools onReply={() => setReplyTo({ id: c.id, name: c.mine ? t('You') : c.authorName || t('Our team') })} onEdit={c.mine ? () => setEditingId(c.id) : null} onDelete={c.mine ? () => act({ action: 'delete', commentId: c.id }, 'del') : null} />}
                        </div>
                    ))}
                    {!d.comments.length && <p className="py-2 text-sm text-gray-500">{t('Add details or ask a question here.')}</p>}
                </div>
                {!ro ? (
                    <div className="mt-4">
                        <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                        <RichEditor mentions={false} images={false} minHeight={90} placeholder={r.status === 'waiting' ? t('We are waiting for your answer…') : t('Write to us')} value={text} onChange={setText} />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {d.canReopen && <Button icon={<TbRefresh />} loading={busy === 'reopen'} onClick={() => act({ action: 'reopen', comment: text }, 'reopen')}>{t('It is not solved: reopen')}</Button>}
                            <Button className="ms-auto" size="sm" variant="solid" loading={busy === 'say'} disabled={!text.replace(/<[^>]*>/g, '').trim()} onClick={send}>{t('Send a message')}</Button>
                        </div>
                    </div>
                ) : <p className="mt-3 text-xs text-gray-500">{t('Preview: you cannot answer from here.')}</p>}
            </Card>
        </div>
    )
}
