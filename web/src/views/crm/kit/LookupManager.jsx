/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { TbGripVertical, TbPencil, TbTrash, TbPlus } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { api, notify, qs } from './api'
import { tr } from '@/utils/t'

/**
 * A short list (groups, sources, statuses, categories) you can manage in place: add at the top, click a name to rename it,
 * drag the handle to reorder (when the list has an order), pick a colour (when it has one), delete with a confirmation.
 * `resource.lookup` = { orderField?, colorField? }. The pencil opens the full form for any other field.
 */
const LookupManager = ({ resource, canCreate, canEdit, canDelete, reloadKey, onOpen }) => {
    const { orderField, colorField } = resource.lookup
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState('')
    const [editing, setEditing] = useState(null) // { id, name }
    const [del, setDel] = useState(null)
    const [over, setOver] = useState(null)
    const drag = useRef(null)

    const load = useCallback(async () => {
        try {
            const d = await api(`/api/crm/${resource.key}?${qs({ pageIndex: 1, pageSize: 200, ...(orderField ? { sortKey: orderField, order: 'asc' } : { sortKey: 'name', order: 'asc' }) })}`)
            setRows(d.list)
        } catch (e) { notify('danger', e.message) } finally { setLoading(false) }
    }, [resource.key, orderField])
    useEffect(() => { load() }, [load, reloadKey])

    const patch = (id, body) => api(`/api/crm/${resource.key}/${id}`, { method: 'PATCH', body })
    const add = async () => {
        const name = adding.trim()
        if (!name) return
        try {
            await api(`/api/crm/${resource.key}`, { method: 'POST', body: { name, ...(orderField ? { [orderField]: rows.length + 1 } : {}) } })
            setAdding('')
            load()
        } catch (e) { notify('danger', e.message) }
    }
    const rename = async () => {
        const e = editing
        setEditing(null)
        const name = (e?.name || '').trim()
        const cur = rows.find((r) => r.id === e?.id)
        if (!e || !name || name === cur?.name) return
        setRows((l) => l.map((r) => (r.id === e.id ? { ...r, name } : r)))
        try { await patch(e.id, { name }) } catch (err) { notify('danger', err.message); load() }
    }
    const recolor = async (r, color) => {
        setRows((l) => l.map((x) => (x.id === r.id ? { ...x, [colorField]: color } : x)))
        try { await patch(r.id, { [colorField]: color }) } catch (err) { notify('danger', err.message); load() }
    }
    const remove = async (r) => {
        try { await api(`/api/crm/${resource.key}/${r.id}`, { method: 'DELETE' }); notify('success', tr("Deleted")); load() } catch (e) { notify('danger', e.message) }
    }
    const drop = async (toIndex) => {
        const from = drag.current
        drag.current = null
        setOver(null)
        if (from === null || from === toIndex) return
        const next = [...rows]
        const [moved] = next.splice(from, 1)
        next.splice(toIndex, 0, moved)
        const changed = next.map((r, i) => ({ r, order: i + 1 })).filter(({ r, order }) => r[orderField] !== order)
        setRows(next.map((r, i) => ({ ...r, [orderField]: i + 1 })))
        try { await Promise.all(changed.map(({ r, order }) => patch(r.id, { [orderField]: order }))) } catch (e) { notify('danger', e.message); load() }
    }

    return (
        <div className="mx-auto max-w-[760px]">
            {canCreate && (
                <div className="mb-4 flex gap-2">
                    <Input size="sm" placeholder={tr("New {what}", { what: resource.label.toLowerCase() })} value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
                    <Button size="sm" variant="solid" icon={<TbPlus />} disabled={!adding.trim()} onClick={add}>{tr("Add")}</Button>
                </div>
            )}
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                {rows.map((r, i) => (
                    <div
                        key={r.id}
                        className={`flex items-center gap-3 px-3 py-2.5 ${over === i ? 'bg-primary/5' : ''}`}
                        draggable={!!orderField && canEdit && editing?.id !== r.id}
                        onDragStart={() => { drag.current = i }}
                        onDragOver={(e) => { if (drag.current !== null) { e.preventDefault(); setOver(i) } }}
                        onDragEnd={() => { drag.current = null; setOver(null) }}
                        onDrop={(e) => { e.preventDefault(); drop(i) }}
                    >
                        {orderField && <span className={`text-lg text-gray-400 ${canEdit ? 'cursor-grab' : ''}`} aria-hidden="true"><TbGripVertical /></span>}
                        {colorField && (
                            <input type="color" disabled={!canEdit} value={/^#[0-9a-f]{6}$/i.test(r[colorField] || '') ? r[colorField] : '#9ca3af'} onChange={(e) => recolor(r, e.target.value)} aria-label={tr("Color")} className="h-6 w-6 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                        )}
                        <div className="min-w-0 flex-1">
                            {editing?.id === r.id ? (
                                <Input autoFocus size="sm" value={editing.name} onChange={(e) => setEditing({ id: r.id, name: e.target.value })} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setEditing(null) }} />
                            ) : (
                                <button type="button" disabled={!canEdit} className="block max-w-full truncate text-left font-medium hover:text-primary" onClick={() => setEditing({ id: r.id, name: r.name })} title={canEdit ? tr("Click to rename") : undefined}>{r.name}</button>
                            )}
                        </div>
                        {r.isDefault && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700">{tr("Default")}</span>}
                        <Tooltip title={canEdit ? tr("Edit") : tr("View")}><Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => onOpen(r.id)} /></Tooltip>
                        {canDelete && <Tooltip title={tr("Delete")}><Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(r)} /></Tooltip>}
                    </div>
                ))}
                {loading && !rows.length && <div className="py-8 text-center text-gray-400">{tr("Loading…")}</div>}
                {!loading && !rows.length && <div className="py-8 text-center text-gray-400">{tr("Nothing here yet")}</div>}
            </div>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this item?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const r = del; setDel(null); remove(r) }}>
                <p>{del?.name}</p>
            </ConfirmDialog>
        </div>
    )
}

export default LookupManager
