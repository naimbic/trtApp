import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { TbPencil, TbArrowLeft, TbEye, TbThumbUp, TbThumbDown, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import Tag from '@/components/ui/Tag'
import { api, notify } from '../kit/api'
import { ArticleLayout } from './parts'
import { tr } from '@/utils/t'

const KbArticle = () => {
    const { id } = useParams()
    const nav = useNavigate()
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [del, setDel] = useState(false)
    useEffect(() => { setD(null); api(`/api/crm/kb/articles/${id}`).then(setD).catch((e) => setError(e.message)) }, [id])
    if (error) return <Container><div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div><Button className="mt-4" onClick={() => nav('/crm/knowledge-base')}>{tr("Back to the knowledge base")}</Button></Container>
    if (!d) return <Container><Skeleton height={300} /></Container>
    const a = d.article
    return (
        <Container>
            <ArticleLayout
                article={a} toc={d.toc} related={d.related} onRelated={(rid) => nav(`/crm/knowledge-base/article/${rid}`)}
                backTo={<div className="mb-4 flex flex-wrap items-center justify-between gap-2"><Link to="/crm/knowledge-base" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"><TbArrowLeft />{tr("Knowledge base")}</Link>
                    <div className="flex gap-2">{d.can.edit && <Button size="sm" icon={<TbPencil />} onClick={() => nav(`/crm/knowledge-base/edit/${id}`)}>{tr("Edit")}</Button>}{d.can.delete && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(true)}>{tr("Delete")}</Button>}</div></div>}
                headExtra={<>{a.staffOnly && <Tag className="bg-amber-100 text-amber-700">{tr("Staff only")}</Tag>}{!a.active && <Tag className="bg-gray-200 text-gray-600">{tr("Draft")}</Tag>}</>}
                footer={<div className="mt-10 flex flex-wrap items-center gap-5 rounded-xl bg-gray-100 p-4 text-sm dark:bg-gray-700/50"><span className="inline-flex items-center gap-1 font-semibold"><TbEye className="text-lg" />{a.views} {tr("views")}</span><span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><TbThumbUp className="text-lg" />{a.helpful} {tr("found it helpful")}</span><span className="inline-flex items-center gap-1 font-semibold text-red-500"><TbThumbDown className="text-lg" />{a.notHelpful} {tr("did not")}</span><span className="text-gray-500">{a.staffOnly ? tr("Visible to staff only.") : tr("Visible to clients in their client area.")}</span></div>}
            />
            <ConfirmDialog isOpen={del} type="danger" title={tr("Delete this article?")} confirmText={tr("Delete")} onClose={() => setDel(false)} onCancel={() => setDel(false)} onConfirm={async () => { setDel(false); try { await api(`/api/crm/kb/articles/${id}`, { method: 'DELETE' }); notify('success', tr("Article deleted")); nav('/crm/knowledge-base/manage') } catch (e) { notify('danger', e.message) } }}><p>{tr("The article, its feedback and view history are removed for good.")}</p></ConfirmDialog>
        </Container>
    )
}

export default KbArticle
