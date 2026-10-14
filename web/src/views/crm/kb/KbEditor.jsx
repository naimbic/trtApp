import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TbArrowNarrowLeft } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import CreatableSelect from 'react-select/creatable'
import { api, notify } from '../kit/api'
import VisualEditor from '../mail/VisualEditor'

const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>

const KbEditor = () => {
    const { id } = useParams()
    const nav = useNavigate()
    const [v, setV] = useState(null)
    const [groups, setGroups] = useState([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const set = (p) => setV((x) => ({ ...x, ...p }))
    useEffect(() => {
        Promise.all([api('/api/crm/kb/articles'), id ? api(`/api/crm/kb/articles/${id}?raw=1`) : null]).then(([m, a]) => {
            setGroups(m.groups)
            setV(a ? { subject: a.article.subject, groupId: a.article.groupId, description: a.article.html, active: a.article.active, staffOnly: a.article.staffOnly } : { subject: '', groupId: null, description: '', active: true, staffOnly: false })
        }).catch((e) => setError(e.message))
    }, [id])
    const newGroup = async (name) => { try { const r = await api('/api/crm/kb/groups', { method: 'POST', body: { name } }); const m = await api('/api/crm/kb/articles'); setGroups(m.groups); set({ groupId: r.id }) } catch (e) { notify('danger', e.message) } }
    const save = async () => {
        setSaving(true); setError('')
        try { const r = await api(id ? `/api/crm/kb/articles/${id}` : '/api/crm/kb/articles', { method: id ? 'PUT' : 'POST', body: v }); notify('success', id ? 'Article saved' : 'Article created'); nav(`/crm/knowledge-base/article/${r.id}`) } catch (e) { setError(e.message); window.scrollTo({ top: 0, behavior: 'smooth' }) } finally { setSaving(false) }
    }
    if (!v) return <Container><div className="py-16 text-center text-gray-400">{error || 'Loading…'}</div></Container>
    const opts = groups.map((g) => ({ value: g.id, label: g.name }))
    return (
        <div className="flex h-full w-full flex-col justify-between">
            <Container>
                <div className="mb-4"><h3>{id ? 'Edit article' : 'New article'}</h3></div>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                <div className="flex flex-col gap-4 xl:flex-row">
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                        <Card><L>Title</L><Input value={v.subject} placeholder="e.g. How to reset your hosting password" onChange={(e) => set({ subject: e.target.value })} /></Card>
                        <Card><div className="mb-3"><h4>Article</h4><p className="text-sm text-gray-500">Headings (H2, H3) become the “In this page” menu.</p></div><VisualEditor docKey={`kb-${id || 'new'}`} value={v.description} onChange={(html) => set({ description: html })} /></Card>
                    </div>
                    <div className="flex flex-col gap-4 xl:w-[340px]">
                        <Card><h4 className="mb-4">Group</h4><Select componentAs={CreatableSelect} isClearable options={opts} value={opts.find((o) => o.value === v.groupId) || null} onChange={(o) => set({ groupId: o?.value || null })} onCreateOption={newGroup} formatCreateLabel={(t) => `Create group “${t}”`} placeholder="Pick or create a group" /></Card>
                        <Card>
                            <h4>Visibility</h4>
                            <div className="mt-5 flex items-center justify-between gap-6"><div><h6>Published</h6><p className="text-sm text-gray-500">Turn off to keep it as a draft.</p></div><Switcher checked={v.active} onChange={(c) => set({ active: c })} /></div>
                            <div className="mt-5 flex items-center justify-between gap-6"><div><h6>Staff only</h6><p className="text-sm text-gray-500">Hidden from clients in their client area.</p></div><Switcher checked={v.staffOnly} onChange={(c) => set({ staffOnly: c })} /></div>
                        </Card>
                    </div>
                </div>
            </Container>
            <BottomStickyBar><Container><div className="flex items-center justify-between px-8"><Button type="button" variant="plain" icon={<TbArrowNarrowLeft />} onClick={() => nav(id ? `/crm/knowledge-base/article/${id}` : '/crm/knowledge-base')}>Back</Button><Button variant="solid" loading={saving} disabled={!v.subject.trim()} onClick={save}>{id ? 'Save changes' : 'Create article'}</Button></div></Container></BottomStickyBar>
        </div>
    )
}

export default KbEditor
