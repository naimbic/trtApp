import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TbPlus, TbSearch, TbTrash, TbFolderPlus, TbArrowLeft } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import { api, notify } from '../kit/api'
import { tr, trn } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const STATES = [['', tr("All")], ['published', tr("Published")], ['draft', tr("Drafts")], ['staff', tr("Staff only")]]

const GroupDialog = ({ open, onClose, groups, onChanged }) => {
    const [name, setName] = useState('')
    const [color, setColor] = useState('#3b82f6')
    const [del, setDel] = useState(null)
    const add = async () => { try { await api('/api/crm/kb/groups', { method: 'POST', body: { name, color } }); setName(''); onChanged() } catch (e) { notify('danger', e.message) } }
    const patch = async (g, p) => { try { await api(`/api/crm/kb/groups/${g.id}`, { method: 'PUT', body: { ...g, ...p } }); onChanged() } catch (e) { notify('danger', e.message); onChanged() } }
    return (
        <Dialog isOpen={open} width={620} onClose={onClose} onRequestClose={onClose}>
            <h4>{tr("Groups")}</h4>
            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                {groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                        <input type="color" value={g.color || '#64748b'} onChange={(e) => patch(g, { color: e.target.value })} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                        <Input size="sm" defaultValue={g.name} onBlur={(e) => e.target.value.trim() && e.target.value !== g.name && patch(g, { name: e.target.value })} />
                        <select aria-label={tr("Language")} value={g.language || ''} onChange={(e) => patch(g, { language: e.target.value || null })} className="h-8 w-28 shrink-0 rounded-lg border border-gray-200 bg-transparent px-1.5 text-xs dark:border-gray-600"><option value="">{tr("All languages")}</option>{[['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['ja', '日本語'], ['ar', 'العربية']].map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select>
                        <span className="w-8 shrink-0 text-right text-xs text-gray-400">{g.count}</span>
                        <Switcher checked={g.active} onChange={(c) => patch(g, { active: c })} />
                        <button type="button" className="text-red-500" onClick={() => setDel(g)}><TbTrash /></button>
                    </div>
                ))}
                {!groups.length && <p className="text-sm text-gray-500">{tr("No groups yet.")}</p>}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" /><Input size="sm" placeholder={tr("New group")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()} /><Button size="sm" variant="solid" disabled={!name.trim()} icon={<TbPlus />} onClick={add}>{tr("Add")}</Button></div>
            <p className="mt-2 text-xs text-gray-500">{tr("The switch hides a whole group from the help center.")}</p>
            <div className="mt-4 flex justify-end"><Button onClick={onClose}>{tr("Done")}</Button></div>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete “{name}”?", { name: del?.name })} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={async () => { const g = del; setDel(null); try { await api(`/api/crm/kb/groups/${g.id}`, { method: 'DELETE' }); onChanged() } catch (e) { notify('danger', e.message) } }}><p>{tr("The")} {del?.count || 0} {tr("articles in it are kept without a group.")}</p></ConfirmDialog>
        </Dialog>
    )
}

const KbManage = () => {
    const nav = useNavigate()
    const [d, setD] = useState({ list: [], groups: [], can: {} })
    const [search, setSearch] = useState('')
    const [state, setState] = useState('')
    const [groupId, setGroupId] = useState(null)
    const [dialog, setDialog] = useState(false)
    const [error, setError] = useState('')
    const load = useCallback(() => api('/api/crm/kb/articles').then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [])
    useEffect(() => { load() }, [load])
    const t = search.trim().toLowerCase()
    const rows = d.list.filter((a) => (!groupId || a.group?.id === groupId) && (!t || `${a.subject} ${a.excerpt}`.toLowerCase().includes(t)) && (!state || (state === 'published' ? a.active : state === 'draft' ? !a.active : a.staffOnly)))
    const gOpts = d.groups.map((g) => ({ value: g.id, label: g.name }))
    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><div className="mb-1 cursor-pointer text-sm text-gray-500 hover:text-primary" data-href={'/crm/knowledge-base'} onClick={() => nav('/crm/knowledge-base')}><TbArrowLeft className="mr-1 inline" />{tr("Knowledge base")}</div><h3>{tr("Manage articles")}</h3></div>
                <div className="flex gap-2">{d.can.edit && <Button icon={<TbFolderPlus />} onClick={() => setDialog(true)}>{tr("Groups")}</Button>}{d.can.create && <Button variant="solid" icon={<TbPlus />} data-href={'/crm/knowledge-base/new'} onClick={() => nav('/crm/knowledge-base/new')}>{tr("New article")}</Button>}</div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search articles")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="w-52"><Select size="sm" isClearable placeholder={tr("Any group")} options={gOpts} value={gOpts.find((o) => o.value === groupId) || null} onChange={(o) => setGroupId(o?.value || null)} /></div>
                <Segment size="sm" value={state} onChange={(v) => setState(Array.isArray(v) ? v[0] ?? '' : v ?? '')}>{STATES.map(([v, l]) => <Segment.Item key={v || 'all'} value={v}>{l}</Segment.Item>)}</Segment>
                <span className="ml-auto text-sm text-gray-500">{trn(rows.length, "article")}</span>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table hoverable>
                    <THead><Tr><Th>{tr("Article")}</Th><Th>{tr("Group")}</Th><Th>{tr("For")}</Th><Th>{tr("Status")}</Th><Th className="text-right">{tr("Views")}</Th><Th className="text-right">{tr("Helpful")}</Th><Th>{tr("Updated")}</Th></Tr></THead>
                    <TBody>
                        {rows.map((a) => (
                            <Tr key={a.id} className="cursor-pointer" data-href={`/crm/knowledge-base/edit/${a.id}`} onClick={() => nav(`/crm/knowledge-base/edit/${a.id}`)}>
                                <Td className="max-w-[360px]"><div className="truncate font-semibold heading-text">{a.subject}</div><div className="truncate text-xs text-gray-500">{a.excerpt}</div></Td>
                                <Td>{a.group ? <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: a.group.color || '#64748b' }} />{a.group.name}</span> : '—'}</Td>
                                <Td>{a.staffOnly ? <Tag className="bg-amber-100 text-amber-700">{tr("Staff")}</Tag> : <Tag className="bg-sky-100 text-sky-700">{tr("Clients")}</Tag>}</Td>
                                <Td>{a.active ? <Tag className="bg-emerald-100 text-emerald-700">{tr("Published")}</Tag> : <Tag className="bg-gray-200 text-gray-600">{tr("Draft")}</Tag>}</Td>
                                <Td className="text-right tabular-nums">{a.views}</Td>
                                <Td className="text-right tabular-nums">{a.helpful}{a.notHelpful ? <span className="text-gray-400"> / {a.notHelpful}</span> : ''}</Td>
                                <Td className="whitespace-nowrap text-gray-500">{dayjs(a.updatedAt).format('DD MMM YYYY')}</Td>
                            </Tr>
                        ))}
                        {!rows.length && <Tr><Td colSpan={7} className="py-10 text-center text-gray-500">{tr("No articles match")}</Td></Tr>}
                    </TBody>
                </Table>
            </div>
            <GroupDialog open={dialog} onClose={() => setDialog(false)} groups={d.groups} onChanged={load} />
        </Container>
    )
}

export default KbManage
