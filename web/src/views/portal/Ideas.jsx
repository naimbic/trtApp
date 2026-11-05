import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { TbBulb, TbCheck, TbThumbUp, TbThumbDown, TbMessageCircle, TbCalendar, TbExternalLink, TbFlame, TbBolt } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import { CommentTools, CommentEdit, ReplyQuote, ReplyingTo, CommentThread } from '@/components/crm/CommentParts'
import Skeleton from '@/components/ui/Skeleton'
import Tag from '@/components/ui/Tag'
import { portal, money } from './api'
import { Empty } from './ui'
import { OFFER_KINDS, TERMS } from '@/lib/crm/ideaOffer'
import { useI18n } from './i18n'
import { usePortal } from './PortalApp'

const UNIT = { monthly: 'per month', quarterly: 'every 3 months', yearly: 'per year', one_shot: 'once' }
/** What is offered, line by line: the main price, the setup fee, each option, the discount, and the totals. */
const OfferView = ({ i, t }) => {
    const o = i.offer, tt = i.totals
    if (!o || !tt) return null
    const kind = OFFER_KINDS.find(([k]) => k === o.kind)?.[1] || 'Other'
    const term = o.billing === 'one_shot' ? '' : o.term === 0 ? t('Open contract') : t(TERMS.find(([k]) => k === o.term)?.[1] || '')
    const line = (label, amount, unit) => <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-1.5 last:border-0 dark:border-gray-700"><span>{label}</span><span className="shrink-0 tabular-nums"><b>{money(amount, i.currency)}</b> <span className="text-xs text-gray-400">{t(UNIT[unit])}</span></span></div>
    return (
        <Card className="xl:col-span-3">
            <h5 className="mb-1">{t('Our offer')}</h5>
            <p className="mb-3 text-sm text-gray-500">{t(kind.replace(/ \(.*\)$/, ''))}{term ? ` · ${term}` : ''}{o.billing !== 'one_shot' && o.term === 0 && o.noticeMonths ? ` · ${t('{n} month(s) notice', { n: o.noticeMonths })}` : ''}</p>
            <div className="text-sm">
                {o.price > 0 && line(t(kind.replace(/ \(.*\)$/, '')), o.price, o.billing)}
                {o.setupFee > 0 && line(t('Setup fee'), o.setupFee, 'one_shot')}
                {o.options.filter((x) => x.on).map((x) => line(`${x.label}${x.qty > 1 ? ` × ${x.qty}` : ''}`, x.price * x.qty, x.billing))}
                {o.discountPct > 0 && <div className="flex justify-between py-1.5 text-emerald-600"><span>{t('Discount')}</span><b>- {o.discountPct} %</b></div>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700/50"><div className="text-xs text-gray-500">{t('Paid once')}</div><b>{money(tt.oneOff, i.currency)}</b></div>
                <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700/50"><div className="text-xs text-gray-500">{t('Per month')}</div><b>{money(tt.monthly, i.currency)}</b></div>
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-500/10"><div className="text-xs text-gray-500">{t('First year')}</div><b>{money(tt.firstYear, i.currency)}</b></div>
                <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700/50"><div className="text-xs text-gray-500">{tt.contract != null ? t('Whole contract') : t('Contract')}</div><b>{tt.contract != null ? money(tt.contract, i.currency) : tt.open ? t('Open') : '—'}</b></div>
            </div>
        </Card>
    )
}

const TONE = { proposed: 'bg-blue-100 text-blue-700', interested: 'bg-sky-100 text-sky-700', approved: 'bg-emerald-100 text-emerald-700', doing: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700', declined: 'bg-rose-100 text-rose-700' }
const LABEL = { proposed: 'New idea', interested: 'You are interested', approved: 'Approved', doing: 'In progress', done: 'Done', declined: 'Declined' }
const CAT = { grow: 'Grow the business', save: 'Save money', marketing: 'Marketing', sales: 'Sales', tech: 'Tech', ops: 'Operations', brand: 'Brand', other: 'Other' }
const LEVEL = { 1: 'Low', 2: 'Medium', 3: 'High' }
const Dots = ({ n, color }) => <span className="inline-flex gap-0.5">{[1, 2, 3].map((k) => <i key={k} className={`h-1.5 w-1.5 rounded-full ${k <= n ? color : 'bg-gray-200 dark:bg-gray-600'}`} />)}</span>
const Html = ({ html }) => <div className="prose max-w-full dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />

export const Ideas = () => {
    const { t, date } = useI18n()
    const [d, setD] = useState(null)
    useEffect(() => { portal('/ideas').then(setD).catch(() => setD({ list: [] })) }, [])
    return (
        <div>
            <div className="mb-4"><h3>{t('Ideas')}</h3><p className="text-sm text-gray-500">{t('Ideas we prepared to help your business grow or to save you money. Tell us what you think.')}</p></div>
            {!d ? <Card><Skeleton height={120} /></Card> : d.list.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {d.list.map((i) => (
                        <Card key={i.id} bodyClass="h-full">
                            <Link to={`/portal/ideas/${i.id}`} className="flex h-full flex-col gap-3">
                                <div className="flex items-center justify-between gap-2"><span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${d.categories?.[i.category]?.color || '#6b7280'}22`, color: d.categories?.[i.category]?.color || '#6b7280' }}>{t(d.categories?.[i.category]?.name || CAT[i.category] || 'Other')}</span><Tag className={`whitespace-nowrap ${TONE[i.status] || 'bg-gray-100 text-gray-600'}`}>{t(LABEL[i.status] || i.status)}</Tag></div>
                                <h6 className="font-bold leading-snug hover:text-primary">{i.title}</h6>
                                {i.gain && <p className="text-sm text-gray-600 dark:text-gray-300">{i.gain}</p>}
                                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-3"><span className="flex items-center gap-1" title={t('Impact')}><TbFlame className="text-emerald-500" /><Dots n={i.impact} color="bg-emerald-500" /></span><span className="flex items-center gap-1" title={t('Effort')}><TbBolt className="text-amber-500" /><Dots n={i.effort} color="bg-amber-500" /></span></span>
                                    <span>{i.price != null && <b className="text-sm text-gray-700 dark:text-gray-200">{money(i.price, i.currency)}</b>}{i.dueDate && i.status === 'proposed' && <span className="ms-2"><TbCalendar className="inline" /> {date(i.dueDate)}</span>}</span>
                                </div>
                            </Link>
                        </Card>
                    ))}
                </div>
            ) : <Card><Empty>{t('No idea to look at yet. When we have one for you, it appears here.')}</Empty></Card>}
        </div>
    )
}

export const IdeaDetail = () => {
    const { t, date } = useI18n()
    const { id } = useParams()
    const { me } = usePortal()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [text, setText] = useState('')
    const [busy, setBusy] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const load = () => portal(`/ideas/${id}`).then(setD).catch((e) => setError(e.message))
    useEffect(() => { load() }, [id])
    if (error) return <Card><div className="text-red-500">{error}</div><Link to="/portal/ideas" className="mt-3 inline-block text-primary">{t('Back to ideas')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { idea: i } = d
    const ro = !!me.preview
    const answer = async (a) => { setBusy(a); try { await portal(`/ideas/${id}`, { method: 'POST', body: { action: 'answer', answer: a, comment: text } }); setText(''); await load() } catch (e) { setError(e.message) } finally { setBusy('') } }
    const edit = async (c, body) => { await portal(`/ideas/${id}`, { method: 'POST', body: { action: 'edit', commentId: c.id, body } }); setEditingId(null); await load() }
    const remove = async (c) => { try { await portal(`/ideas/${id}`, { method: 'POST', body: { action: 'delete', commentId: c.id } }); await load() } catch (e) { setError(e.message) } }
    const send = async () => { if (!text.trim()) return; setBusy('say'); try { await portal(`/ideas/${id}`, { method: 'POST', body: { action: 'comment', body: text, replyToId: replyTo?.id } }); setText(''); setReplyTo(null); await load() } catch (e) { setError(e.message) } finally { setBusy('') } }
    return (
        <div className="flex flex-col gap-4">
            <div><div className="mb-1 text-sm text-gray-500"><Link to="/portal/ideas" className="hover:text-primary">{t('Ideas')}</Link></div><div className="flex flex-wrap items-center gap-3"><h3 className="flex items-center gap-2"><TbBulb className="text-blue-500" />{i.title}</h3><Tag className={`whitespace-nowrap ${TONE[i.status] || ''}`}>{t(LABEL[i.status] || i.status)}</Tag></div></div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <h5 className="mb-3">{t('The idea')}</h5>
                    {i.body ? <Html html={i.body} /> : <p className="text-gray-500">{i.gain}</p>}
                    {i.sources?.length > 0 && <div className="mt-4 text-xs"><b className="text-gray-500">{t('Sources')}</b>{i.sources.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer noopener" className="mt-1 flex items-center gap-1 truncate text-primary hover:underline"><TbExternalLink className="shrink-0" />{s}</a>)}</div>}
                </Card>
                <Card bordered={false} className="bg-gray-100 shadow-none dark:bg-gray-800">
                    <h5>{t('At a glance')}</h5>
                    <div className="mt-4 flex flex-col gap-3 text-sm">
                        {i.gain && <div><span className="font-semibold heading-text">{t('What you gain')}: </span>{i.gain}</div>}
                        <div className="flex items-center gap-2"><span className="font-semibold heading-text">{t('Impact')}:</span><Dots n={i.impact} color="bg-emerald-500" /> {t(LEVEL[i.impact])}</div>
                        <div className="flex items-center gap-2"><span className="font-semibold heading-text">{t('Effort')}:</span><Dots n={i.effort} color="bg-amber-500" /> {t(LEVEL[i.effort])}</div>
                        {i.price != null && <div><span className="font-semibold heading-text">{t('Estimated price')}: </span>{money(i.price, i.currency)}</div>}
                        {i.dueDate && <div><span className="font-semibold heading-text">{t('Answer by')}: </span>{date(i.dueDate)}</div>}
                        {i.answer && <div className="rounded-lg bg-white p-2 dark:bg-gray-700"><TbCheck className="me-1 inline text-emerald-500" />{t('Your answer')}: <b>{t(LABEL[i.answer] || i.answer)}</b>{i.answeredAt ? ` · ${date(i.answeredAt)}` : ''}</div>}
                    </div>
                </Card>
                <OfferView i={i} t={t} />
            </div>
            <Card>
                <h5 className="mb-3"><TbMessageCircle className="me-1 inline" />{t('Your answer and questions')}</h5>
                <div className="space-y-3">
                    <CommentThread comments={d.comments} render={(c) => (
                        <div key={c.id} className={`group relative flex gap-2.5 ${c.mine ? 'flex-row-reverse' : ''}`}>
                            <div className={`min-w-0 max-w-[88%] flex-1 rounded-xl p-3 text-sm ${c.mine ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-gray-50 dark:bg-gray-700/40'}`}>
                                <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500"><b className="truncate">{c.mine ? t('You') : c.authorName || t('Our team')}</b><span className="ms-auto shrink-0">{date(c.createdAt, 'DD MMM HH:mm')}{c.edited ? ` · ${t('edited')}` : ''}</span></div>
                                <ReplyQuote r={c.replyTo} />
                                {editingId === c.id ? <CommentEdit plain initial={c.body} onCancel={() => setEditingId(null)} onSave={(b) => edit(c, b)} /> : <RichView mentions={false} html={c.body} />}
                            </div>
                            {!ro && editingId !== c.id && <CommentTools onReply={() => setReplyTo({ id: c.id, name: c.mine ? t('You') : c.authorName || t('Our team') })} onEdit={c.mine ? () => setEditingId(c.id) : null} onDelete={c.mine ? () => remove(c) : null} />}
                        </div>
                    )} />
                    {!d.comments.length && <p className="py-2 text-sm text-gray-500">{t('Ask a question or tell us what you think.')}</p>}
                </div>
                {!ro ? (
                    <div className="mt-4">
                        <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                        <RichEditor mentions={false} images={false} minHeight={90} placeholder={t('Write to us (optional with your answer)')} value={text} onChange={setText} />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {d.canAnswer && <>
                                <Button variant="solid" icon={<TbThumbUp />} loading={busy === 'approved'} onClick={() => answer('approved')}>{t('Approve')}</Button>
                                <Button icon={<TbBulb />} loading={busy === 'interested'} onClick={() => answer('interested')}>{t('I am interested')}</Button>
                                <Button variant="plain" className="text-red-500" icon={<TbThumbDown />} loading={busy === 'declined'} onClick={() => answer('declined')}>{t('Not now')}</Button>
                            </>}
                            <Button className="ms-auto" size="sm" loading={busy === 'say'} disabled={!text.replace(/<[^>]*>/g, '').trim()} onClick={send}>{t('Send a message')}</Button>
                        </div>
                    </div>
                ) : <p className="mt-3 text-xs text-gray-500">{t('Preview: you cannot answer from here.')}</p>}
            </Card>
        </div>
    )
}
