import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { TbBulb, TbCheck, TbThumbUp, TbThumbDown, TbMessageCircle, TbCalendar, TbExternalLink, TbFlame, TbBolt } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import Tag from '@/components/ui/Tag'
import { portal, money } from './api'
import { Empty } from './ui'
import { useI18n } from './i18n'
import { usePortal } from './PortalApp'

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
    const load = () => portal(`/ideas/${id}`).then(setD).catch((e) => setError(e.message))
    useEffect(() => { load() }, [id])
    if (error) return <Card><div className="text-red-500">{error}</div><Link to="/portal/ideas" className="mt-3 inline-block text-primary">{t('Back to ideas')}</Link></Card>
    if (!d) return <Card><Skeleton height={160} /></Card>
    const { idea: i } = d
    const ro = !!me.preview
    const answer = async (a) => { setBusy(a); try { await portal(`/ideas/${id}`, { method: 'POST', body: { action: 'answer', answer: a, comment: text } }); setText(''); await load() } catch (e) { setError(e.message) } finally { setBusy('') } }
    const send = async () => { if (!text.trim()) return; setBusy('say'); try { await portal(`/ideas/${id}`, { method: 'POST', body: { action: 'comment', body: text } }); setText(''); await load() } catch (e) { setError(e.message) } finally { setBusy('') } }
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
            </div>
            <Card>
                <h5 className="mb-3"><TbMessageCircle className="me-1 inline" />{t('Your answer and questions')}</h5>
                <div className="space-y-2">
                    {d.comments.map((c) => <div key={c.id} className={`rounded-xl p-3 text-sm ${c.mine ? 'ms-8 bg-blue-50 dark:bg-blue-500/10' : 'me-8 bg-gray-50 dark:bg-gray-700/40'}`}><div className="mb-0.5 text-xs text-gray-500"><b>{c.mine ? t('You') : c.authorName || t('Our team')}</b> · {date(c.createdAt, 'DD MMM HH:mm')}</div><div className="whitespace-pre-wrap">{c.body}</div></div>)}
                    {!d.comments.length && <p className="py-2 text-sm text-gray-500">{t('Ask a question or tell us what you think.')}</p>}
                </div>
                {!ro ? (
                    <div className="mt-4">
                        <Input textArea rows={2} placeholder={t('Write to us (optional with your answer)')} value={text} onChange={(e) => setText(e.target.value)} />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {d.canAnswer && <>
                                <Button variant="solid" icon={<TbThumbUp />} loading={busy === 'approved'} onClick={() => answer('approved')}>{t('Approve')}</Button>
                                <Button icon={<TbBulb />} loading={busy === 'interested'} onClick={() => answer('interested')}>{t('I am interested')}</Button>
                                <Button variant="plain" className="text-red-500" icon={<TbThumbDown />} loading={busy === 'declined'} onClick={() => answer('declined')}>{t('Not now')}</Button>
                            </>}
                            <Button className="ms-auto" size="sm" loading={busy === 'say'} disabled={!text.trim()} onClick={send}>{t('Send a message')}</Button>
                        </div>
                    </div>
                ) : <p className="mt-3 text-xs text-gray-500">{t('Preview: you cannot answer from here.')}</p>}
            </Card>
        </div>
    )
}
