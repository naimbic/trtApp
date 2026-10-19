import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import { Form, FormItem } from '@/components/ui/Form'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RelationSelect from './RelationSelect'
import { api, notify } from './api'
import { tr } from '@/utils/t'

const empty = (f) => (f.type === 'boolean' ? false : ['multiselect', 'tags', 'sections'].includes(f.type) ? [] : '')
const initValue = (f, v) => {
    if (v === undefined || v === null) return empty(f)
    if (['date', 'datetime'].includes(f.type)) return v ? new Date(v) : null
    if (f.type === 'json') return typeof v === 'string' ? v : JSON.stringify(v, null, 2)
    return v
}

const Control = ({ f, value, onChange, disabled }) => {
    switch (f.type) {
        case 'textarea':
        case 'richtext':
        case 'json':
            return <Input textArea rows={f.type === 'json' ? 6 : 4} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        case 'number':
        case 'money':
            return <Input type="number" step={f.type === 'money' ? '0.01' : 'any'} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        case 'boolean':
            return <Switcher checked={!!value} disabled={disabled} onChange={onChange} />
        case 'date':
            return <DatePicker disabled={disabled} value={value || null} onChange={onChange} />
        case 'datetime':
            return <DatePicker.DateTimepicker disabled={disabled} value={value || null} onChange={onChange} />
        case 'select':
            return <Select isClearable isDisabled={disabled} options={f.options || []} value={(f.options || []).find((o) => String(o.value) === String(value)) || null} onChange={(o) => onChange(o ? o.value : null)} />
        case 'multiselect':
        case 'tags':
            return <Input disabled={disabled} placeholder={tr("comma, separated")} value={Array.isArray(value) ? value.join(', ') : ''} onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        case 'sections': // switches: on = the contact can see it; the stored list holds what is switched OFF
            return (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                    {(f.options || []).map((o) => {
                        const hidden = Array.isArray(value) ? value : []
                        return <label key={o.value} className="flex items-center gap-2 text-sm"><Switcher checked={!hidden.includes(o.value)} disabled={disabled} onChange={(on) => onChange(on ? hidden.filter((x) => x !== o.value) : [...hidden, o.value])} />{tr(o.label)}</label>
                    })}
                </div>
            )
        case 'relation':
            return <RelationSelect resource={f.resource} value={value || null} onChange={onChange} disabled={disabled} />
        case 'color':
            return <Input type="color" disabled={disabled} value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
        case 'email':
            return <Input type="email" disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        default:
            return <Input type={f.type === 'url' ? 'url' : 'text'} disabled={disabled} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    }
}

/**
 * Create / edit a record of any resource from its field config.
 * props: resource, open, id (edit) | null (new), initial (prefill when new), canEdit, canDelete, onClose, onSaved(record), onDeleted()
 */
const RecordDrawer = ({ resource, open, id, initial = {}, hide = [], canEdit = true, canDelete = false, onClose, onSaved, onDeleted }) => {
    const fields = useMemo(() => (resource.fields || []).filter((f) => !f.hidden), [resource])
    const [v, setV] = useState({})
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmDel, setConfirmDel] = useState(false)
    const edit = !!id

    useEffect(() => {
        if (!open) return undefined
        setError('')
        let alive = true
        const base = Object.fromEntries(fields.map((f) => [f.key, initValue(f, undefined)]))
        if (!id) {
            setV({ ...base, ...Object.fromEntries(Object.entries(initial).map(([k, val]) => [k, val])) })
            return undefined
        }
        setLoading(true)
        api(`/api/crm/${resource.key}/${id}`)
            .then((rec) => alive && setV(Object.fromEntries(fields.map((f) => [f.key, initValue(f, rec[f.key])]))))
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false))
        return () => { alive = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, id, resource.key])

    const sections = useMemo(() => {
        const m = new Map()
        fields.filter((f) => !hide.includes(f.key)).forEach((f) => { const s = f.section || tr("General"); if (!m.has(s)) m.set(s, []); m.get(s).push(f) })
        return [...m.entries()]
    }, [fields, hide])

    const save = async () => {
        setSaving(true)
        setError('')
        try {
            const body = Object.fromEntries(fields.map((f) => [f.key, ['date', 'datetime'].includes(f.type) ? (v[f.key] ? dayjs(v[f.key]).toISOString() : null) : v[f.key]]))
            const rec = edit ? await api(`/api/crm/${resource.key}/${id}`, { method: 'PATCH', body }) : await api(`/api/crm/${resource.key}`, { method: 'POST', body })
            notify('success', `${resource.label} ${edit ? 'saved' : 'created'}`)
            onSaved?.(rec)
            onClose()
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        try {
            await api(`/api/crm/${resource.key}/${id}`, { method: 'DELETE' })
            notify('success', tr("{label} deleted", { label: resource.label }))
            onDeleted?.()
            onClose()
        } catch (e) {
            notify('danger', e.message)
        } finally {
            setConfirmDel(false)
        }
    }

    return (
        <Drawer
            title={edit ? tr("Edit {v1}", { v1: resource.label.toLowerCase() }) : tr("New {v1}", { v1: resource.label.toLowerCase() })}
            isOpen={open}
            onClose={onClose}
            onRequestClose={onClose}
            width={560}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && canDelete && <Button variant="plain" className="text-red-500" onClick={() => setConfirmDel(true)}>{tr("Delete")}</Button>}
                    <div className="ml-auto flex gap-2">
                        <Button onClick={onClose}>{canEdit ? tr("Cancel") : tr("Close")}</Button>
                        {canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? tr("Save changes") : tr("Create")}</Button>}
                    </div>
                </div>
            }
        >
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            {loading ? (
                <div className="py-16 text-center text-gray-400">{tr("Loading…")}</div>
            ) : (
                <Form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
                    {sections.map(([title, list]) => (
                        <div key={title}>
                            {sections.length > 1 && <h6 className="mb-3 text-gray-500">{title}</h6>}
                            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                                {list.map((f) => (
                                    <FormItem key={f.key} label={f.label} asterisk={f.required} className={['textarea', 'richtext', 'json', 'sections'].includes(f.type) ? 'sm:col-span-2' : ''}>
                                        <Control f={f} value={v[f.key]} disabled={!canEdit} onChange={(val) => setV((s) => ({ ...s, [f.key]: val }))} />
                                    </FormItem>
                                ))}
                            </div>
                        </div>
                    ))}
                </Form>
            )}
            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr("Delete {v1}?", { v1: resource.label.toLowerCase() })} confirmText={tr("Delete")} onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{tr("This cannot be undone.")}</p>
            </ConfirmDialog>
        </Drawer>
    )
}

export default RecordDrawer
