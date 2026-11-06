import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TbPlus, TbSearch, TbTrash, TbFolderPlus, TbArrowLeft, TbPencil, TbChevronDown, TbEye, TbThumbUp, TbFolder, TbUsers, TbLock, TbGripVertical, TbStar, TbStarFilled, TbPin, TbPinFilled } from 'react-icons/tb'
import dayjs from 'dayjs'
import Container from '@/components/shared/Container'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Segment from '@/components/ui/Segment'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tooltip from '@/components/ui/Tooltip'
import { useRowDrag, DragHandle } from '@/components/crm/RowDrag'
import { api, notify } from '../kit/api'
import { tr, trn } from '@/utils/t'

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

const SIZES = [5, 10, 20, 50]
const MIME = 'text/kb-article'

/** Page buttons under a group: only when it holds more articles than one page. */
const Pager = ({ total, page, size, onPage }) => {
    const pages = Math.max(1, Math.ceil(total / size))
    if (total <= size) return null
    const near = [...new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b)
    const btn = 'grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-xs font-semibold transition'
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 dark:border-gray-700">
            <span className="text-xs text-gray-500">{tr("{from}–{to} of {total}", { from: (page - 1) * size + 1, to: Math.min(total, page * size), total })}</span>
            <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${btn} text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700`}>{tr("Previous")}</button>
                {near.map((n, i) => (
                    <span key={n} className="flex items-center gap-1">
                        {i > 0 && n - near[i - 1] > 1 && <span className="text-gray-400">…</span>}
                        <button type="button" onClick={() => onPage(n)} className={`${btn} ${n === page ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{n}</button>
                    </span>
                ))}
                <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${btn} text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700`}>{tr("Next")}</button>
            </div>
        </div>
    )
}

/** One group: a coloured header (drag the group, fold it, hide it, edit it, delete it) and its articles (drag to reorder or to move to another group). */
const GroupBlock = ({ g, items, can, open, onToggle, size, groupDrag, index, onDropArticle, onToggleGroup, onEditGroup, onDeleteGroup, onPatch, onDelete, nav, filtered }) => {
    const [page, setPage] = useState(1)
    const [over, setOver] = useState(null) // article id the drag is over, or 'end'
    const real = !!g.id
    useEffect(() => { setPage(1) }, [size, filtered, items.length])
    const pages = Math.max(1, Math.ceil(items.length / size))
    const cur = Math.min(page, pages)
    const shown = items.slice((cur - 1) * size, cur * size)
    const color = g.color || '#64748b'
    const accept = (e) => { if (can.edit && [...(e.dataTransfer?.types || [])].includes(MIME)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return true } return false }
    const drop = (e, before) => { const id = e.dataTransfer.getData(MIME); setOver(null); if (!id) return; e.preventDefault(); e.stopPropagation(); onDropArticle(id, g, before) }
    return (
        <div className={`rounded-xl border bg-white dark:bg-gray-800 ${groupDrag && real ? groupDrag.over === index ? 'border-primary' : 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'}`} {...(real ? groupDrag?.row(index) : {})}>
            <div
                className="flex flex-wrap items-center gap-2 rounded-t-xl px-3 py-2"
                style={{ background: `${color}14`, borderBottom: open ? `1px solid ${color}33` : 'none', borderRadius: open ? undefined : 12 }}
                onDragOver={(e) => { if (accept(e)) setOver('end') }} onDragLeave={() => setOver(null)} onDrop={(e) => drop(e, null)}
            >
                {real ? <DragHandle enabled={can.edit && !filtered} {...(groupDrag?.handle(index, can.edit && !filtered) || {})} /> : <span className="size-6 shrink-0" />}
                <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg text-base text-white" style={{ background: color }}><TbFolder /></span>
                    <span className={`truncate text-sm font-semibold heading-text ${real && !g.active ? 'opacity-50' : ''}`}>{real ? g.name : tr("No group")}</span>
                    <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">{items.length}</span>
                    {real && g.language && <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase text-gray-500 dark:bg-gray-900/40">{g.language}</span>}
                    {over === 'end' && <span className="shrink-0 text-xs font-semibold text-primary">{tr("Drop here to move it to this group")}</span>}
                    <TbChevronDown className={`ms-auto shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {real && (
                    <span className="flex shrink-0 items-center gap-1">
                        {can.edit && <Tooltip title={g.active ? tr("Shown in the help center") : tr("Hidden from the help center")}><span><Switcher checked={g.active} onChange={(c) => onToggleGroup(g, c)} /></span></Tooltip>}
                        {can.edit && <Tooltip title={tr("Edit the group")}><Button size="xs" variant="plain" icon={<TbPencil />} onClick={() => onEditGroup(g)} /></Tooltip>}
                        {can.delete && <Tooltip title={tr("Delete the group")}><Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => onDeleteGroup(g)} /></Tooltip>}
                    </span>
                )}
            </div>
            {open && (
                <div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {shown.map((a) => (
                            <div
                                key={a.id}
                                className={`flex flex-wrap items-center gap-2 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-700/30 ${over === a.id ? 'bg-primary/5 shadow-[inset_0_2px_0_0_var(--tw-shadow-color)] shadow-primary' : ''}`}
                                onDragOver={(e) => { if (accept(e)) setOver(a.id) }} onDragLeave={() => setOver((o) => (o === a.id ? null : o))} onDrop={(e) => drop(e, a.id)}
                            >
                                <span
                                    draggable={can.edit} data-drag-article
                                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData(MIME, a.id); try { e.dataTransfer.setData('text/plain', a.subject) } catch { /* optional */ } const row = e.currentTarget.parentElement; if (row) try { e.dataTransfer.setDragImage(row, 16, 16) } catch { /* the handle is shown instead */ } }}
                                    onDragEnd={() => setOver(null)}
                                    title={can.edit ? tr("Drag to reorder or to move to another group") : undefined}
                                    className={`grid size-6 shrink-0 select-none place-items-center text-lg text-gray-300 hover:text-gray-500 ${can.edit ? 'cursor-grab active:cursor-grabbing' : 'opacity-0'}`}
                                ><DragGlyph /></span>
                                <button type="button" className={`min-w-0 flex-1 basis-56 text-start ${a.active ? '' : 'opacity-60'}`} data-href={`/crm/knowledge-base/${can.edit ? 'edit' : 'article'}/${a.id}`} onClick={() => nav(`/crm/knowledge-base/${can.edit ? 'edit' : 'article'}/${a.id}`)}>
                                    <span className="block truncate font-semibold heading-text">{a.subject}</span>
                                    <span className="block truncate text-xs text-gray-500">{a.excerpt}</span>
                                </button>
                                <Tooltip title={a.staffOnly ? tr("Only the team sees it") : tr("The clients see it too")}>
                                    <button type="button" disabled={!can.edit} onClick={() => onPatch(a, { staffOnly: !a.staffOnly })} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${a.staffOnly ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{a.staffOnly ? <><TbLock />{tr("Staff")}</> : <><TbUsers />{tr("Clients")}</>}</button>
                                </Tooltip>
                                <span className="inline-flex w-14 shrink-0 items-center justify-end gap-1 text-xs tabular-nums text-gray-500" title={tr("Views")}><TbEye />{a.views}</span>
                                <span className="inline-flex w-16 shrink-0 items-center justify-end gap-1 text-xs tabular-nums text-gray-500" title={tr("Helpful")}><TbThumbUp />{a.helpful}{a.notHelpful ? <span className="text-gray-400">/{a.notHelpful}</span> : ''}</span>
                                <span className="hidden w-24 shrink-0 whitespace-nowrap text-end text-xs text-gray-400 md:block">{dayjs(a.updatedAt).format('DD MMM YYYY')}</span>
                                <Tooltip title={a.active ? tr("Published: click to hide it") : tr("Hidden: click to publish it")}><span className="shrink-0"><Switcher checked={a.active} disabled={!can.edit} onChange={(c) => onPatch(a, { active: c })} /></span></Tooltip>
                                <span className="flex shrink-0 items-center">
                                    <Tooltip title={a.favorite ? tr("Remove from my favorites") : tr("Add to my favorites")}><Button size="xs" variant="plain" className={a.favorite ? 'text-amber-500' : ''} icon={a.favorite ? <TbStarFilled /> : <TbStar />} onClick={() => onPatch(a, { favorite: !a.favorite })} /></Tooltip>
                                    {can.edit && <Tooltip title={a.pinned ? tr("Unpin") : tr("Pin it first in its group and on the help center")}><Button size="xs" variant="plain" className={a.pinned ? 'text-primary' : ''} icon={a.pinned ? <TbPinFilled /> : <TbPin />} onClick={() => onPatch(a, { pinned: !a.pinned })} /></Tooltip>}
                                    <Tooltip title={tr("Read it")}><Button size="xs" variant="plain" icon={<TbEye />} onClick={() => nav(`/crm/knowledge-base/article/${a.id}`)} /></Tooltip>
                                    {can.edit && <Tooltip title={tr("Edit")}><Button size="xs" variant="plain" icon={<TbPencil />} onClick={() => nav(`/crm/knowledge-base/edit/${a.id}`)} /></Tooltip>}
                                    {can.delete && <Tooltip title={tr("Delete")}><Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => onDelete(a)} /></Tooltip>}
                                </span>
                            </div>
                        ))}
                        {!items.length && <div className="px-3 py-5 text-center text-sm text-gray-400">{can.edit ? tr("No article here. Drag one into this group.") : tr("No article here.")}</div>}
                    </div>
                    <Pager total={items.length} page={cur} size={size} onPage={setPage} />
                </div>
            )}
        </div>
    )
}

/** The grip glyph (same as the other lists). */
const DragGlyph = () => <TbGripVertical />

const KbManage = () => {
    const nav = useNavigate()
    const [d, setD] = useState({ list: [], groups: [], can: {} })
    const [search, setSearch] = useState('')
    const [state, setState] = useState('')
    const [size, setSize] = useState(() => { try { return Number(localStorage.getItem('kb-page-size')) || 10 } catch { return 10 } })
    const [closed, setClosed] = useState(() => { try { return JSON.parse(localStorage.getItem('kb-closed') || '[]') } catch { return [] } })
    const [dialog, setDialog] = useState(false)
    const [delGroup, setDelGroup] = useState(null)
    const [delArticle, setDelArticle] = useState(null)
    const [error, setError] = useState('')
    const load = useCallback(() => api('/api/crm/kb/articles').then((r) => { setD(r); setError('') }).catch((e) => setError(e.message)), [])
    useEffect(() => { load() }, [load])
    const keep = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)) } catch { /* private window */ } }
    const can = d.can || {}
    const t = search.trim().toLowerCase()
    const filtered = !!t || !!state
    const match = (a) => (!t || `${a.subject} ${a.excerpt}`.toLowerCase().includes(t)) && (!state || (state === 'published' ? a.active : state === 'draft' ? !a.active : a.staffOnly))
    const none = { id: null, name: '', color: '#94a3b8', active: true }
    const blocks = [...d.groups, ...(d.list.some((a) => !a.groupId || !d.groups.some((g) => g.id === a.groupId)) ? [none] : [])]
    const itemsOf = (g) => d.list.filter((a) => (g.id ? a.groupId === g.id : !a.groupId || !d.groups.some((x) => x.id === a.groupId))).filter(match)
    const visible = blocks.filter((g) => !filtered || itemsOf(g).length)
    const total = visible.reduce((n, g) => n + itemsOf(g).length, 0)
    const isOpen = (g) => (filtered ? true : !closed.includes(g.id || 'none'))
    const toggle = (g) => { const k = g.id || 'none'; const next = closed.includes(k) ? closed.filter((x) => x !== k) : [...closed, k]; setClosed(next); keep('kb-closed', next) }
    const all = (open) => { const next = open ? [] : blocks.map((g) => g.id || 'none'); setClosed(next); keep('kb-closed', next) }

    const onPatch = async (a, p) => {
        setD((x) => ({ ...x, list: x.list.map((r) => (r.id === a.id ? { ...r, ...p } : r)) }))
        try { await api(`/api/crm/kb/articles/${a.id}`, { method: 'PATCH', body: p }); notify('success', tr("Saved")) } catch (e) { notify('danger', e.message); load() }
    }
    const onToggleGroup = async (g, active) => {
        setD((x) => ({ ...x, groups: x.groups.map((r) => (r.id === g.id ? { ...r, active } : r)) }))
        try { await api(`/api/crm/kb/groups/${g.id}`, { method: 'PUT', body: { ...g, active } }) } catch (e) { notify('danger', e.message); load() }
    }
    // an article dropped on a row of a group goes before that row; dropped on the header it goes last
    const onDropArticle = async (id, g, beforeId) => {
        const a = d.list.find((x) => x.id === id)
        if (!a || id === beforeId) return
        const ids = itemsOf(g).map((x) => x.id).filter((x) => x !== id)
        const at = beforeId ? ids.indexOf(beforeId) : -1
        ids.splice(at < 0 ? ids.length : at, 0, id)
        setD((x) => ({ ...x, list: x.list.map((r) => (ids.includes(r.id) ? { ...r, groupId: g.id, order: ids.indexOf(r.id) + 1 } : r)).sort((p, q) => (p.order || 0) - (q.order || 0)) }))
        try { await api('/api/crm/kb/articles/reorder', { method: 'POST', body: { ids, groupId: g.id } }); load() } catch (e) { notify('danger', e.message); load() }
    }
    const moveGroup = async (from, to) => {
        const ids = d.groups.map((g) => g.id)
        const [m] = ids.splice(from, 1)
        ids.splice(to, 0, m)
        setD((x) => ({ ...x, groups: ids.map((id, i) => ({ ...x.groups.find((g) => g.id === id), order: i + 1 })) }))
        try { await api('/api/crm/kb/groups/reorder', { method: 'POST', body: { ids } }) } catch (e) { notify('danger', e.message); load() }
    }
    const groupDrag = useRowDrag(moveGroup)
    return (
        <Container>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div><div className="mb-1 cursor-pointer text-sm text-gray-500 hover:text-primary" data-href={'/crm/knowledge-base'} onClick={() => nav('/crm/knowledge-base')}><TbArrowLeft className="mr-1 inline" />{tr("Knowledge base")}</div><h3>{tr("Manage articles")}</h3></div>
                <div className="flex gap-2">{can.edit && <Button icon={<TbFolderPlus />} onClick={() => setDialog(true)}>{tr("Groups")}</Button>}{can.create && <Button variant="solid" icon={<TbPlus />} data-href={'/crm/knowledge-base/new'} onClick={() => nav('/crm/knowledge-base/new')}>{tr("New article")}</Button>}</div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="w-64"><Input size="sm" prefix={<TbSearch />} placeholder={tr("Search articles")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <Segment size="sm" value={state} onChange={(v) => setState(Array.isArray(v) ? v[0] ?? '' : v ?? '')}>{STATES.map(([v, l]) => <Segment.Item key={v || 'all'} value={v}>{l}</Segment.Item>)}</Segment>
                <label className="flex items-center gap-1.5 text-sm text-gray-500">{tr("Per group")}<select value={size} onChange={(e) => { setSize(Number(e.target.value)); keep('kb-page-size', e.target.value) }} className="h-8 rounded-lg border border-gray-200 bg-transparent px-1.5 text-sm dark:border-gray-600">{SIZES.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
                <span className="ml-auto flex items-center gap-3 text-sm text-gray-500"><button type="button" className="hover:text-primary" onClick={() => all(true)}>{tr("Expand all")}</button><button type="button" className="hover:text-primary" onClick={() => all(false)}>{tr("Collapse all")}</button>{trn(total, "article")}</span>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <div className="flex flex-col gap-3">
                {visible.map((g, i) => (
                    <GroupBlock
                        key={g.id || 'none'} g={g} index={d.groups.findIndex((x) => x.id === g.id)} items={itemsOf(g)} can={can} open={isOpen(g)} onToggle={() => toggle(g)} size={size} filtered={filtered}
                        groupDrag={groupDrag} onDropArticle={onDropArticle} onToggleGroup={onToggleGroup} onEditGroup={() => setDialog(true)} onDeleteGroup={setDelGroup} onPatch={onPatch} onDelete={setDelArticle} nav={nav}
                    />
                ))}
                {!visible.length && <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-gray-500 dark:border-gray-600">{tr("No articles match")}</div>}
            </div>
            <GroupDialog open={dialog} onClose={() => setDialog(false)} groups={d.groups} onChanged={load} />
            <ConfirmDialog isOpen={!!delArticle} type="danger" title={tr("Delete “{name}”?", { name: delArticle?.subject })} confirmText={tr("Delete")} onClose={() => setDelArticle(null)} onCancel={() => setDelArticle(null)} onConfirm={async () => { const a = delArticle; setDelArticle(null); try { await api(`/api/crm/kb/articles/${a.id}`, { method: 'DELETE' }); notify('success', tr("Deleted")); load() } catch (e) { notify('danger', e.message) } }}><p>{tr("The article, its votes and its views are deleted for good.")}</p></ConfirmDialog>
            <ConfirmDialog isOpen={!!delGroup} type="danger" title={tr("Delete “{name}”?", { name: delGroup?.name })} confirmText={tr("Delete")} onClose={() => setDelGroup(null)} onCancel={() => setDelGroup(null)} onConfirm={async () => { const g = delGroup; setDelGroup(null); try { await api(`/api/crm/kb/groups/${g.id}`, { method: 'DELETE' }); load() } catch (e) { notify('danger', e.message) } }}><p>{tr("The")} {delGroup?.count || 0} {tr("articles in it are kept without a group.")}</p></ConfirmDialog>
        </Container>
    )
}

export default KbManage
