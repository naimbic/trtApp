import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { TbPlus, TbSettings, TbArrowLeft } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import { api, qs } from '../kit/api'
import { Hero, GroupCard, ArticleRow } from './parts'
import { tr, trn } from '@/utils/t'

const KbHub = () => {
    const nav = useNavigate()
    const [sp, setSp] = useSearchParams()
    const q = sp.get('q') || ''
    const groupId = sp.get('group') || ''
    const [text, setText] = useState(q)
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => setText(q), [q])
    const load = useCallback(async () => { try { setD(await api(`/api/crm/kb/hub?${qs({ q, groupId })}`)); setError('') } catch (e) { setError(e.message) } }, [q, groupId])
    useEffect(() => { setD(null); load() }, [load])
    const search = () => { const n = {}; if (text.trim()) n.q = text.trim(); setSp(n) }
    const open = (id) => nav(`/crm/knowledge-base/article/${id}`)

    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><h3>{tr("Knowledge base")}</h3><p className="text-sm text-gray-500">{tr("Procedures and answers for the team and for clients.")}</p></div>
                <div className="flex gap-2">
                    {d?.can.edit && <Button icon={<TbSettings />} onClick={() => nav('/crm/knowledge-base/manage')}>{tr("Manage articles")}</Button>}
                    {d?.can.create && <Button variant="solid" icon={<TbPlus />} onClick={() => nav('/crm/knowledge-base/new')}>{tr("New article")}</Button>}
                </div>
            </div>
            <Hero title={tr("How can we help?")} text={tr("Search for answers, browse by topic, or open the most read articles.")} value={text} onChange={setText} onSearch={search} />
            {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div className="mx-auto mt-10 max-w-[1200px] px-2">
                {!d ? <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} height={170} />)}</div> : d.results ? (
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <Button size="sm" variant="plain" icon={<TbArrowLeft />} onClick={() => setSp({})}>{tr("All topics")}</Button>
                            <h4>{d.group ? d.group.name : tr("Results for “{q}”", { q: q })}</h4><span className="text-sm text-gray-500">{trn(d.results.length, "article")}</span>
                        </div>
                        {d.group?.description && <p className="mb-2 text-gray-500">{d.group.description}</p>}
                        {d.results.map((a, i) => <ArticleRow key={a.id} a={a} last={i === d.results.length - 1} onClick={() => open(a.id)} />)}
                        {!d.results.length && <p className="py-10 text-center text-gray-500">{tr("No article matches. Try other words.")}</p>}
                    </div>
                ) : (
                    <div className="flex flex-col gap-14">
                        <div>
                            <h3 className="mb-6">{tr("Topics")}</h3>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{d.groups.map((g) => <GroupCard key={g.id} g={g} onClick={() => setSp({ group: g.id })} />)}</div>
                            {!d.groups.length && <p className="text-gray-500">{tr("No topics yet. Create a group in “Manage articles”.")}</p>}
                        </div>
                        {d.popular?.length > 0 && <div><h3 className="mb-2">{tr("Most read")}</h3>{d.popular.map((a, i) => <ArticleRow key={a.id} a={a} last={i === d.popular.length - 1} onClick={() => open(a.id)} />)}</div>}
                        {d.recent?.length > 0 && <div><h3 className="mb-2">{tr("Recently updated")}</h3>{d.recent.map((a, i) => <ArticleRow key={a.id} a={a} last={i === d.recent.length - 1} onClick={() => open(a.id)} />)}</div>}
                    </div>
                )}
            </div>
        </Container>
    )
}

export default KbHub
