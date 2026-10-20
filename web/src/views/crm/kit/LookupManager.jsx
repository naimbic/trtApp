/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { TbGripVertical, TbPencil, TbTrash, TbPlus } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import Switcher from '@/components/ui/Switcher'
import Tooltip from '@/components/ui/Tooltip'
import { api, notify, qs } from './api'
import { tr } from '@/utils/t'

const INLINE = ['text', 'email', 'url', 'number', 'money', 'date', 'boolean', 'color', 'select']
const ctl = 'h-8 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-gray-200 focus:border-primary focus:bg-white focus:outline-none dark:hover:border-gray-600 dark:focus:bg-gray-800'

/** One editable cell: text-like fields save on Enter / leaving the field, switches and selects save at once, colours after a short pause. */
const Cell = ({ field, value, disabled, onCommit, draft }) => {
    const [v, setV] = useState(value ?? '')
    const timer = useRef(null)
    useEffect(() => { setV(value ?? '') }, [value])
    const label = tr(field.label)
    if (field.type === 'boolean') return <Switcher checked={value === undefined || value === null ? !!field.defaultOn : !!value} disabled={disabled} onChange={(c) => onCommit(c)} />
    if (field.type === 'color') {
        const ok = /^#[0-9a-f]{6}$/i.test(v || '')
        return (
            <span className="inline-flex items-center gap-2">
                <input type="color" disabled={disabled} aria-label={label} value={ok ? v : '#9ca3af'} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    onChange={(e) => { const c = e.target.value; setV(c); clearTimeout(timer.current); timer.current = setTimeout(() => onCommit(c), 450) }} />
                {ok && !disabled && !draft && <button type="button" className="text-xs text-gray-400 hover:text-red-500" onClick={() => { setV(''); onCommit('') }} title={tr("Clear")}>×</button>}
            </span>
        )
    }
    if (field.type === 'select') {
        return (
            <select disabled={disabled} aria-label={label} className={ctl} value={v ?? ''} onChange={(e) => { setV(e.target.value); onCommit(e.target.value) }}>
                {!field.required && <option value="">—</option>}
                {(field.options || []).map((o) => <option key={o.value} value={o.value}>{tr(o.label)}</option>)}
            </select>
        )
    }
    const num = ['number', 'money'].includes(field.type)
    const done = () => { const next = num ? (v === '' ? '' : Number(v)) : String(v).trim(); if (next !== (value ?? '')) onCommit(next) }
    return (
        <input
            disabled={disabled} aria-label={label} placeholder={draft ? label : undefined} className={ctl}
            type={num ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'} step={field.type === 'money' ? '0.01' : undefined}
            value={v ?? ''} onChange={(e) => setV(e.target.value)} onBlur={done}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value ?? ''); e.currentTarget.blur() } }}
        />
    )
}

/**
 * A settings list (groups, sources, statuses, taxes, currencies, payment modes...) edited in place, like a spreadsheet:
 * type in a cell, flip a switch, pick a colour, drag the handle to reorder (when the list has an order), add a row at the top.
 * `resource.lookup` = { orderField? }. The pencil opens the full form for the fields that do not fit a cell (long text...).
 */
const LookupManager = ({ resource, canCreate, canEdit, canDelete, reloadKey, onOpen }) => {
    const { orderField } = resource.lookup
    const title = resource.titleField
    const main = resource.fields.find((f) => f.key === title) || resource.fields[0]
    const cols = resource.fields.filter((f) => f.key !== main.key && f.key !== orderField && INLINE.includes(f.type))
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [draft, setDraft] = useState({})
    const [del, setDel] = useState(null)
    const [over, setOver] = useState(null)
    const [q, setQ] = useState('')
    const uses = !!resource.usage // how many records use each item
    const drag = useRef(null)
    const grid = { gridTemplateColumns: `${orderField ? '22px ' : ''}minmax(180px, 1.8fr) ${cols.map(() => 'minmax(96px, 1fr)').join(' ')} ${uses ? '64px ' : ''}76px` }

    const load = useCallback(async () => {
        try {
            const d = await api(`/api/crm/${resource.key}?${qs({ pageIndex: 1, pageSize: 200, sortKey: orderField || main.key, order: 'asc' })}`)
            setRows(d.list)
        } catch (e) { notify('danger', e.message) } finally { setLoading(false) }
    }, [resource.key, orderField, main.key])
    useEffect(() => { load() }, [load, reloadKey])

    const patch = (id, body) => api(`/api/crm/${resource.key}/${id}`, { method: 'PATCH', body })
    const save = async (r, key, value) => {
        setRows((l) => l.map((x) => (x.id === r.id ? { ...x, [key]: value } : x)))
        try { await patch(r.id, { [key]: value === '' ? null : value }) } catch (e) { notify('danger', e.message); load() }
    }
    const add = async () => {
        const body = { ...draft }
        if (!String(body[main.key] || '').trim()) { notify('warning', tr("Type a {what} first", { what: tr(main.label).toLowerCase() })); return }
        for (const [k, v] of Object.entries(body)) if (v === '' || v === undefined) delete body[k]
        for (const f of cols) if (f.type === 'boolean' && f.defaultOn && body[f.key] === undefined) body[f.key] = true
        if (orderField) body[orderField] = rows.length + 1
        try { await api(`/api/crm/${resource.key}`, { method: 'POST', body }); setDraft({}); load() } catch (e) { notify('danger', e.message) }
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
        <div className="overflow-x-auto">
            {rows.length > 6 && <div className="mb-2 w-60"><input type="search" className={`${ctl} border-gray-200 bg-white dark:border-gray-600`} placeholder={tr("Search…")} value={q} onChange={(e) => setQ(e.target.value)} /></div>}
            <div className="min-w-[560px] rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="grid items-center gap-3 border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-700" style={grid}>
                    {orderField && <span />}
                    <span>{tr(main.label)}</span>
                    {cols.map((f) => <span key={f.key}>{tr(f.label)}</span>)}
                    {uses && <span>{tr("In use")}</span>}
                    <span />
                </div>
                {canCreate && (
                    <div className="grid items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-700 dark:bg-gray-700/20" style={grid} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); setTimeout(add, 0) } }}>
                        {orderField && <span />}
                        <input className={`${ctl} border-gray-200 bg-white dark:border-gray-600`} placeholder={tr("New {what}", { what: tr(resource.label).toLowerCase() })} aria-label={tr(main.label)} value={draft[main.key] || ''} onChange={(e) => setDraft((d) => ({ ...d, [main.key]: e.target.value }))} />
                        {cols.map((f) => <div key={f.key}>{f.required || ['color', 'boolean', 'select'].includes(f.type) || f.type === 'number' ? <Cell draft field={f} value={draft[f.key]} onCommit={(val) => setDraft((d) => ({ ...d, [f.key]: val }))} /> : <span />}</div>)}
                        {uses && <span />}
                        <Button size="xs" variant="solid" icon={<TbPlus />} onClick={add}>{tr("Add")}</Button>
                    </div>
                )}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map((r, i) => (!q.trim() || String(r[main.key] || '').toLowerCase().includes(q.trim().toLowerCase())) && (
                        <div
                            key={r.id}
                            className={`grid items-center gap-3 px-3 py-1.5 ${over === i ? 'bg-primary/5' : ''}`} style={grid}
                            onDragOver={(e) => { if (drag.current !== null) { e.preventDefault(); setOver(i) } }} onDrop={(e) => { e.preventDefault(); drop(i) }}
                        >
                            {orderField && <span className={`text-lg text-gray-400 ${canEdit ? 'cursor-grab' : ''}`} draggable={canEdit} onDragStart={() => { drag.current = i }} onDragEnd={() => { drag.current = null; setOver(null) }} aria-hidden="true"><TbGripVertical /></span>}
                            <div className={r.isActive === false ? 'opacity-50' : undefined}><Cell field={main} value={r[main.key]} disabled={!canEdit} onCommit={(val) => (val === '' ? load() : save(r, main.key, val))} /></div>
                            {cols.map((f) => <div key={f.key} className={r.isActive === false && f.key !== 'isActive' ? 'opacity-50' : undefined}><Cell field={f} value={r[f.key]} disabled={!canEdit} onCommit={(val) => save(r, f.key, val)} /></div>)}
                            {uses && <span className={`text-sm tabular-nums ${r._uses ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-300'}`} title={r._uses ? tr("Records using it") : tr("Not used")}>{r._uses || 0}</span>}
                            <span className="flex justify-end gap-0.5">
                                <Tooltip title={canEdit ? tr("Edit") : tr("View")}><Button size="xs" variant="plain" icon={<TbPencil />} onClick={() => onOpen(r.id)} /></Tooltip>
                                {canDelete && <Tooltip title={tr("Delete")}><Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(r)} /></Tooltip>}
                            </span>
                        </div>
                    ))}
                </div>
                {loading && !rows.length && <div className="py-8 text-center text-gray-400">{tr("Loading…")}</div>}
                {!loading && !rows.length && <div className="py-8 text-center text-gray-400">{tr("Nothing here yet")}</div>}
            </div>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr("Delete this item?")} confirmText={tr("Delete")} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const r = del; setDel(null); remove(r) }}>
                <p>{del?.[main.key]}</p>
            </ConfirmDialog>
        </div>
    )
}

export default LookupManager
