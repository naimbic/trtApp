import { useEffect, useState } from 'react'
import { TbPencil, TbTrash, TbPlus, TbExternalLink } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tag from '@/components/ui/Tag'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { STATUS, PRIORITY, TYPE, KINDS } from './shared'
import { tr } from '@/utils/t'

const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const portal = { menuPortalTarget: document.body, menuPosition: 'fixed', styles: { menuPortal: (b) => ({ ...b, zIndex: 10000 }) } }
export const opts = (list) => list.map((x) => ({ value: x.value ?? x.id, label: x.label ?? x.name }))
export const pick = (list, v) => opts(list).find((o) => o.value === v) || null

/** Report a new issue. */
export const NewIssueDialog = ({ open, lookups, preset, onClose, onCreated }) => {
    const empty = { title: '', description: '', type: 'bug', priority: 'medium', platformId: null, assigneeIds: [], labels: '', dueDate: '', pageUrl: '' }
    const [v, setV] = useState(empty)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    useEffect(() => { if (open) { setV({ ...empty, ...(preset || {}) }); setError('') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const save = async () => {
        setBusy(true); setError('')
        try {
            const r = await api('/api/crm/issues', { method: 'POST', body: { ...v, labels: v.labels.split(',').map((x) => x.trim()).filter(Boolean), dueDate: v.dueDate || null } })
            notify('success', tr('Issue #{number} created', { number: r.number }))
            onCreated(r)
        } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} onClose={onClose} onRequestClose={onClose} width={640}>
            <h5 className="mb-4">{tr('New issue')}</h5>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><L>{tr('Title')} *</L><Input autoFocus value={v.title} maxLength={200} placeholder={tr('What is wrong or missing?')} onChange={(e) => set({ title: e.target.value })} /></div>
                <div><L>{tr('Platform or website')}</L><Select isClearable {...portal} options={opts(lookups.platforms.filter((p) => p.active))} value={pick(lookups.platforms, v.platformId)} onChange={(o) => set({ platformId: o?.value || null })} /></div>
                <div><L>{tr('Page or address')}</L><Input value={v.pageUrl} placeholder="https://" onChange={(e) => set({ pageUrl: e.target.value })} /></div>
                <div><L>{tr('Type')}</L><Select {...portal} isSearchable={false} options={opts(TYPE)} value={pick(TYPE, v.type)} onChange={(o) => set({ type: o.value })} /></div>
                <div><L>{tr('Priority')}</L><Select {...portal} isSearchable={false} options={opts(PRIORITY)} value={pick(PRIORITY, v.priority)} onChange={(o) => set({ priority: o.value })} /></div>
                <div><L>{tr('Assigned to')}</L><Select isMulti {...portal} options={opts(lookups.staff)} value={opts(lookups.staff).filter((o) => v.assigneeIds.includes(o.value))} onChange={(os) => set({ assigneeIds: (os || []).map((o) => o.value) })} /></div>
                <div><L>{tr('Due date')}</L><Input type="date" value={v.dueDate} onChange={(e) => set({ dueDate: e.target.value })} /></div>
                <div className="sm:col-span-2"><L>{tr('Labels')}</L><Input value={v.labels} placeholder={tr('comma, separated')} onChange={(e) => set({ labels: e.target.value })} /></div>
                <div className="sm:col-span-2"><L>{tr('Description')}</L><Input textArea rows={5} value={v.description} placeholder={tr('Steps to reproduce, what you expected, what happened')} onChange={(e) => set({ description: e.target.value })} /></div>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button><Button variant="solid" loading={busy} disabled={!v.title.trim()} onClick={save}>{tr('Create issue')}</Button></div>
        </Dialog>
    )
}

/** The platforms and websites issues belong to. */
export const PlatformsDialog = ({ open, lookups, onClose, onChanged }) => {
    const [edit, setEdit] = useState(null) // platform being edited or {} for a new one
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [del, setDel] = useState(null)
    useEffect(() => { if (open) { setEdit(null); setError('') } }, [open])
    const save = async () => {
        setBusy(true); setError('')
        try {
            await api(edit.id ? `/api/crm/issues/platforms/${edit.id}` : '/api/crm/issues/platforms', { method: edit.id ? 'PUT' : 'POST', body: edit })
            notify('success', tr('Platform saved'))
            setEdit(null); onChanged()
        } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    const remove = async () => {
        const p = del; setDel(null)
        try { await api(`/api/crm/issues/platforms/${p.id}`, { method: 'DELETE' }); notify('success', tr('Platform deleted')); onChanged() } catch (e) { notify('danger', e.message) }
    }
    return (
        <Dialog isOpen={open} onClose={onClose} onRequestClose={onClose} width={620}>
            <div className="mb-4 flex items-center justify-between gap-3"><h5>{tr('Platforms and websites')}</h5>{!edit && lookups.can.create && <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => setEdit({ name: '', url: '', kind: 'website', description: '', active: true })}>{tr('Add')}</Button>}</div>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            {edit ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div><L>{tr('Name')} *</L><Input autoFocus value={edit.name} maxLength={80} placeholder="trtdigital.ma" onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
                    <div><L>{tr('Kind')}</L><Select {...portal} isSearchable={false} options={opts(KINDS)} value={pick(KINDS, edit.kind)} onChange={(o) => setEdit({ ...edit, kind: o.value })} /></div>
                    <div className="sm:col-span-2"><L>{tr('Address')}</L><Input value={edit.url || ''} placeholder="https://" onChange={(e) => setEdit({ ...edit, url: e.target.value })} /></div>
                    <div className="sm:col-span-2"><L>{tr('Description')}</L><Input textArea rows={2} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
                    <div className="flex items-center gap-3 sm:col-span-2"><Switcher checked={edit.active !== false} onChange={(c) => setEdit({ ...edit, active: c })} /><span className="text-sm">{tr('Active (can be chosen for new issues)')}</span></div>
                    <div className="flex justify-end gap-2 sm:col-span-2"><Button onClick={() => setEdit(null)}>{tr('Cancel')}</Button><Button variant="solid" loading={busy} disabled={!edit.name.trim()} onClick={save}>{tr('Save')}</Button></div>
                </div>
            ) : (
                <div className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-700">
                    {lookups.platforms.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 py-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2"><span className="truncate font-semibold heading-text">{p.name}</span><Tag className="bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200">{KINDS.find((k) => k.value === p.kind)?.label}</Tag>{!p.active && <Tag className="bg-amber-100 text-amber-700">{tr('Off')}</Tag>}</div>
                                {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{p.url}<TbExternalLink /></a>}
                            </div>
                            {lookups.can.edit && <Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => setEdit({ ...p })} />}
                            {lookups.can.delete && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(p)} />}
                        </div>
                    ))}
                    {!lookups.platforms.length && <p className="py-10 text-center text-sm text-gray-400">{tr('No platform yet. Add your websites and platforms to follow their issues.')}</p>}
                </div>
            )}
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this platform?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{tr('“{name}” is removed. A platform that has issues cannot be deleted: turn it off instead.', { name: del?.name })}</p>
            </ConfirmDialog>
        </Dialog>
    )
}
