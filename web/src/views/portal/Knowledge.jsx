import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { TbArrowLeft, TbThumbUp, TbThumbDown } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { Hero, GroupCard, ArticleRow, ArticleLayout } from '../crm/kb/parts'
import { portal } from './api'
import { useI18n } from './i18n'

export const Knowledge = () => {
    const { t } = useI18n()
    const nav = useNavigate()
    const [sp, setSp] = useSearchParams()
    const q = sp.get('q') || '', groupId = sp.get('group') || ''
    const [text, setText] = useState(q)
    const [d, setD] = useState(null)
    useEffect(() => setText(q), [q])
    const load = useCallback(() => portal(`/kb?${new URLSearchParams(Object.entries({ q, groupId }).filter(([, v]) => v)).toString()}`).then(setD).catch(() => setD({ groups: [], popular: [] })), [q, groupId])
    useEffect(() => { setD(null); load() }, [load])
    const search = () => setSp(text.trim() ? { q: text.trim() } : {})
    const open = (id) => nav(`/portal/help/${id}`)
    return (
        <div>
            <Hero placeholder={t('Type to search an article')} title={t('How can we help?')} text={t('Find answers to common questions, guides and procedures.')} value={text} onChange={setText} onSearch={search} />
            <div className="mx-auto mt-10 max-w-[1100px] px-2">
                {!d ? <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} height={170} />)}</div> : d.results ? (
                    <div>
                        <div className="mb-4 flex items-center gap-3"><Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => setSp({})}>{t('All topics')}</Button><h4>{d.group ? d.group.name : t('Results for “{q}”', { q })}</h4></div>
                        {d.results.map((a, i) => <ArticleRow key={a.id} a={a} unit={t('min read')} last={i === d.results.length - 1} onClick={() => open(a.id)} />)}
                        {!d.results.length && <p className="py-10 text-center text-gray-500">{t('No article matches. Try other words, or open a support request.')}</p>}
                    </div>
                ) : (
                    <div className="flex flex-col gap-12">
                        <div><h3 className="mb-6">{t('Topics')}</h3><div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{d.groups.map((g) => <GroupCard key={g.id} g={g} onClick={() => setSp({ group: g.id })} />)}</div>{!d.groups.length && <p className="text-gray-500">{t('No articles have been published yet.')}</p>}</div>
                        {d.popular?.length > 0 && <div><h3 className="mb-2">{t('Most read')}</h3>{d.popular.map((a, i) => <ArticleRow key={a.id} a={a} unit={t('min read')} last={i === d.popular.length - 1} onClick={() => open(a.id)} />)}</div>}
                    </div>
                )}
            </div>
        </div>
    )
}

export const HelpArticle = () => {
    const { t } = useI18n()
    const { id } = useParams()
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [sent, setSent] = useState(null)
    const [msg, setMsg] = useState('')
    useEffect(() => { setD(null); setSent(null); setMsg(''); portal(`/kb/${id}`).then(setD).catch((e) => setError(e.message)) }, [id])
    const vote = async (helpful) => { try { await portal(`/kb/${id}/feedback`, { method: 'POST', body: { helpful } }); setSent(helpful); setMsg(t('Thank you for your feedback.')) } catch (e) { setMsg(e.message); setSent('x') } }
    if (error) return <Card><div className="text-red-500">{error}</div><Link to="/portal/help" className="mt-3 inline-block text-primary">{t('Back to the help center')}</Link></Card>
    if (!d) return <Card><Skeleton height={260} /></Card>
    return (
        <ArticleLayout
            labels={{ toc: t('In this page'), related: t('More in this group'), empty: t('This article has no text yet.') }} article={d.article} toc={d.toc} related={d.related} onRelated={(rid) => nav(`/portal/help/${rid}`)}
            backTo={<div className="mb-4"><Link to="/portal/help" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"><TbArrowLeft />{t('Help center')}</Link></div>}
            footer={
                <Card className="mt-10"><div className="flex flex-wrap items-center justify-between gap-3"><h6>{t('Was this article helpful?')}</h6>
                    {sent === null ? <div className="flex gap-2"><Button icon={<TbThumbUp />} onClick={() => vote(true)}>{t('Yes')}</Button><Button icon={<TbThumbDown />} onClick={() => vote(false)}>{t('No')}</Button></div> : <span className="text-sm text-gray-500">{msg}</span>}</div>
                    {sent === false && <p className="mt-3 text-sm text-gray-500">{t('Sorry about that.')} <Link to="/portal/tickets" className="font-semibold text-primary">{t('Open a support request')}</Link> {t('and we will help you.')}</p>}
                </Card>
            }
        />
    )
}
