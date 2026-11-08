import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { TbChartBar, TbCompass, TbMessageCircle, TbPaperclip, TbLink, TbCheck, TbEdit, TbX } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import { CommentTools, CommentEdit, ReplyQuote, ReplyingTo, CommentThread } from '@/components/crm/CommentParts'
import Skeleton from '@/components/ui/Skeleton'
import { portal } from './api'
import { Empty } from './ui'
import { useI18n } from './i18n'
import { usePortal } from './PortalApp'

const ICON = { report: <TbChartBar />, strategy: <TbCompass /> }
const KIND = { report: 'Report', strategy: 'Strategy' }
const STATUS = { sent: 'Waiting for your answer', reviewing: 'Under review', changes: 'Changes requested', approved: 'Approved', declined: 'Declined' }
const TONE = { sent: 'bg-blue-100 text-blue-700', reviewing: 'bg-violet-100 text-violet-700', changes: 'bg-orange-100 text-orange-700', approved: 'bg-green-100 text-green-700', declined: 'bg-gray-200 text-gray-600' }
const Pill = ({ status, t }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status] || 'bg-gray-100 text-gray-600'}`}>{t(STATUS[status] || status)}</span>

export const Reports = () => {
    const { t, date } = useI18n()
    const [d, setD] = useState(null)
    useEffect(() => { portal('/reports').then(setD).catch(() => setD({ list: [] })) }, [])
    return (
        <div>
            <div className="mb-4"><h3>{t('Reports & Strategies')}</h3><p className="text-sm text-gray-500">{t('The reports and the strategies we share with you. Read them, approve them or ask for changes.')}</p></div>
            {d?.waiting > 0 && <div className="mb-4 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-700">{t('{n} document(s) are waiting for your answer.', { n: d.waiting })}</div>}
            {!d ? <Card><Skeleton height={120} /></Card> : d.list.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {d.list.map((r) => (
                        <Card key={r.id} bodyClass="h-full">
                            <Link to={`/portal/reports/${r.id}`} className="flex h-full flex-col gap-2">
                                <div className="flex items-center justify-between gap-2 text-xs text-gray-500"><span className="inline-flex items-center gap-1 font-semibold">{ICON[r.kind]}{r.code} · {t(KIND[r.kind])}</span><Pill status={r.status} t={t} /></div>
                                <h6 className="font-bold leading-snug hover:text-primary">{r.title}</h6>
                                {r.period && <div className="text-xs text-gray-500">{r.period}</div>}
                                <div className="mt-auto flex items-center justify-between text-xs text-gray-400"><span>{(r.attachments.length + r.links.length) > 0 ? <span className="inline-flex items-center gap-1"><TbPaperclip />{r.attachments.length + r.links.length}</span> : ''}</span><span>{date(r.sentAt || r.updatedAt, 'DD MMM')}</span></div>
                            </Link>
                        </Card>
                    ))}
                </div>
            ) : <Card><Empty>{t('Nothing has been shared with you yet.')}</Empty></Card>}
        </div>
    )
}

export const ReportDetail = () => {
    const { t, date } = useI18n()
    const { id } = useParams()
    const { me } = usePortal()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [text, setText] = useState('')
    const [busy, setBusy] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const load = () => portal(`/reports/${id}`).then(setD).catch((e) => setError(e.message))
    useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    if (error) return <Card><div className="text-red-500">{error}</div><Link to="/portal/reports" className="mt-3 inline-block text-primary">{t('Back')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { report: r } = d
    const ro = !!me.preview
    const act = async (body, key) => { setBusy(key); try { await portal(`/reports/${id}`, { method: 'POST', body }); setText(''); setReplyTo(null); await load() } catch (e) { setError(e.message) } finally { setBusy('') } }
    const send = () => text.replace(/<[^>]*>/g, '').trim() && act({ action: 'comment', body: text, replyToId: replyTo?.id }, 'say')
    const answer = (a) => act({ action: 'answer', answer: a, comment: text }, a)
    return (
        <div className="flex flex-col gap-4">
            <div><div className="mb-1 text-sm text-gray-500"><Link to="/portal/reports" className="hover:text-primary">{t('Reports & Strategies')}</Link></div><div className="flex flex-wrap items-center gap-3"><h3 className="flex items-center gap-2"><span className="text-primary">{ICON[r.kind]}</span>{r.title}</h3><Pill status={r.status} t={t} /></div></div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    {r.body ? <RichView mentions={false} html={r.body} /> : <p className="text-gray-500">—</p>}
                    {r.attachments.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{r.attachments.map((a) => a.kind === 'image' ? <a key={a.url} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name} className="h-24 rounded-lg object-cover" /></a> : <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-700"><TbPaperclip />{a.name}</a>)}</div>}
                    {r.links.length > 0 && <div className="mt-3 flex flex-col gap-1.5">{r.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><TbLink className="shrink-0" /><span className="truncate">{l.title || l.url}</span></a>)}</div>}
                </Card>
                <Card bordered={false} className="bg-gray-100 shadow-none dark:bg-gray-800">
                    <h5>{t('At a glance')}</h5>
                    <div className="mt-4 flex flex-col gap-3 text-sm">
                        <div><span className="font-semibold heading-text">{t('Reference')}: </span>{r.code}</div>
                        <div><span className="font-semibold heading-text">{t('Kind')}: </span>{t(KIND[r.kind])}</div>
                        {r.period && <div><span className="font-semibold heading-text">{t('Period')}: </span>{r.period}</div>}
                        <div><span className="font-semibold heading-text">{t('Shared')}: </span>{date(r.sentAt || r.createdAt)}</div>
                        {r.dueDate && <div><span className="font-semibold heading-text">{t('Answer by')}: </span>{date(r.dueDate)}</div>}
                    </div>
                </Card>
            </div>
            <Card>
                <h5 className="mb-3"><TbMessageCircle className="me-1 inline" />{t('Follow-up')}</h5>
                <div className="space-y-3">
                    <CommentThread comments={d.comments} render={(c) => c.system ? <div key={c.id} className="text-center text-xs text-gray-400">{t('Status')}: <b>{t(STATUS[c.system.from] || d.statuses[c.system.from] || c.system.from)}</b> → <b>{t(STATUS[c.system.to] || d.statuses[c.system.to] || c.system.to)}</b> · {date(c.createdAt, 'DD MMM HH:mm')}</div> : (
                        <div key={c.id} className={`group relative flex gap-2.5 ${c.mine ? 'flex-row-reverse' : ''}`}>
                            <div className={`min-w-0 max-w-[88%] flex-1 rounded-xl p-3 text-sm ${c.mine ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
                                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="truncate">{c.mine ? t('You') : c.authorName || t('Our team')}</b><span className="ms-auto shrink-0">{date(c.createdAt, 'DD MMM HH:mm')}{c.edited ? ` · ${t('edited')}` : ''}</span></div>
                                <ReplyQuote r={c.replyTo} />
                                {editingId === c.id ? <CommentEdit plain initial={c.body} onCancel={() => setEditingId(null)} onSave={async (b) => { await act({ action: 'edit', commentId: c.id, body: b }, 'edit'); setEditingId(null) }} /> : <RichView mentions={false} html={c.body} />}
                            </div>
                            {!ro && editingId !== c.id && <CommentTools onReply={() => setReplyTo({ id: c.id, name: c.mine ? t('You') : c.authorName || t('Our team') })} onEdit={c.mine ? () => setEditingId(c.id) : null} onDelete={c.mine ? () => act({ action: 'delete', commentId: c.id }, 'del') : null} />}
                        </div>
                    )} />
                    {!d.comments.length && <p className="py-2 text-sm text-gray-500">{t('Ask a question or tell us what you think here.')}</p>}
                </div>
                {!ro ? (
                    <div className="mt-4">
                        <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                        <RichEditor mentions={false} images={false} minHeight={90} placeholder={t('Write to us')} value={text} onChange={setText} />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {r.canAnswer && <>
                                <Button variant="solid" color="green-500" icon={<TbCheck />} loading={busy === 'approve'} onClick={() => answer('approve')}>{t('Approve')}</Button>
                                <Button icon={<TbEdit />} loading={busy === 'changes'} onClick={() => answer('changes')}>{t('Ask for changes')}</Button>
                                <Button variant="plain" className="text-red-500" icon={<TbX />} loading={busy === 'decline'} onClick={() => answer('decline')}>{t('Decline')}</Button>
                            </>}
                            <Button className="ms-auto" size="sm" variant="solid" loading={busy === 'say'} disabled={!text.replace(/<[^>]*>/g, '').trim()} onClick={send}>{t('Send a message')}</Button>
                        </div>
                    </div>
                ) : <p className="mt-3 text-xs text-gray-500">{t('Preview: you cannot answer from here.')}</p>}
            </Card>
        </div>
    )
}
