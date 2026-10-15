import { useEffect, useRef, useState } from 'react'
import { TbPhotoSearch, TbTrash, TbUpload } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import Switcher from '@/components/ui/Switcher'
import PasswordInput from '@/components/shared/PasswordInput'
import { api, notify, upload } from '../kit/api'
import MediaPicker from '@/components/crm/MediaPicker'
import { tr } from '@/utils/t'

const ZONES = (typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Africa/Casablanca', 'Europe/Paris']).map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))

export const Soon = () => <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20" title={tr("Saved now, used by a screen that is not built yet")}>{tr("Soon")}</span>
const copy = async (t) => { try { await navigator.clipboard.writeText(t); notify('success', tr("{t} copied", { t: t })) } catch { notify('danger', tr("Could not copy")) } }
export const TokenChip = ({ token, onClick }) => (
    <button type="button" onClick={() => (onClick ? onClick(token) : copy(`{${token}}`))} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary dark:bg-gray-700">{`{${token}}`}</button>
)

/* ---------- one image setting: upload, pick from files, remove ---------- */
export const SettingImage = ({ field, value, canEdit, onSaved }) => {
    const input = useRef(null)
    const [busy, setBusy] = useState(false)
    const [picker, setPicker] = useState(false)
    const [broken, setBroken] = useState(false)
    useEffect(() => setBroken(false), [value])
    const url = `/api/crm/settings/image?key=${field.key}`
    const done = (r, msg) => { onSaved?.(r.url); notify('success', msg) }
    const send = async (file) => {
        if (!file) return
        if (!file.type.startsWith('image/')) return notify('danger', tr("Please choose an image"))
        const fd = new FormData(); fd.append('file', file)
        setBusy(true)
        try { done(await upload(url, fd), tr("Image saved (optimised to WebP)")) } catch (e) { notify('danger', e.message) } finally { setBusy(false); if (input.current) input.current.value = '' }
    }
    const pick = async (m) => {
        setPicker(false); setBusy(true)
        try { done(await api(url, { method: 'POST', body: { mediaId: m.id } }), tr("Image set")) } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const remove = async () => { setBusy(true); try { await api(url, { method: 'DELETE' }); onSaved?.(null); notify('success', tr("Image removed")) } catch (e) { notify('danger', e.message) } finally { setBusy(false) } }
    return (
        <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/40">
                {value && !broken ? <img src={value} alt="" onError={() => setBroken(true)} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-gray-400">{broken ? tr("Cannot load") : tr("None")}</span>}
                {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70"><Spinner size={24} /></div>}
            </div>
            {canEdit && (
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" icon={<TbUpload />} onClick={() => input.current?.click()} disabled={busy}>{tr("Upload")}</Button>
                    <Button size="sm" icon={<TbPhotoSearch />} onClick={() => setPicker(true)} disabled={busy}>{tr("From files")}</Button>
                    {value && <Button size="sm" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={remove} disabled={busy}>{tr("Remove")}</Button>}
                    <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => send(e.target.files?.[0])} />
                </div>
            )}
            <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={pick} />
        </div>
    )
}

/* ---------- a form field of any type ---------- */
export const Field = ({ field: x, value, secretSet, onChange, canEdit, taxes }) => {
    const label = (
        <span className="flex flex-wrap items-center">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{x.label}</span>
            {x.soon && <Soon />}
            {x.token && <span className="ml-2"><TokenChip token={x.token} /></span>}
        </span>
    )
    const hint = x.hint && <p className="mt-1 text-xs text-gray-400">{x.hint}</p>

    if (x.type === 'switch') {
        return (
            <div className="flex items-start justify-between gap-4 py-3 md:col-span-2">
                <div className="min-w-0"><div className="text-sm">{label}</div>{hint}</div>
                <Switcher checked={value === '1' || value === 1 || value === true} disabled={!canEdit} onChange={(v) => onChange(v ? '1' : '0')} />
            </div>
        )
    }
    if (x.type === 'image') {
        return <div className="md:col-span-2"><div className="mb-2 text-sm">{label}</div><SettingImage field={x} value={value} canEdit={canEdit} onSaved={(u) => onChange(u || '', true)} />{hint}</div>
    }
    const wide = ['textarea', 'html', 'taxes'].includes(x.type)
    let control
    switch (x.type) {
        case 'number': control = <Input type="number" disabled={!canEdit} min={x.min} max={x.max} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />; break
        case 'textarea': control = <Input textArea rows={x.rows || 3} disabled={!canEdit} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />; break
        case 'html': control = <textarea id={`f-${x.key}`} rows={x.rows || 6} spellCheck={false} disabled={!canEdit} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-xs dark:border-gray-600 dark:bg-gray-800" />; break
        case 'select': { const o = x.options; control = <Select isDisabled={!canEdit} options={o} value={o.find((i) => String(i.value) === String(value)) || null} onChange={(opt) => onChange(opt ? String(opt.value) : '')} />; break }
        case 'timezone': control = <Select isClearable isDisabled={!canEdit} options={ZONES} value={ZONES.find((z) => z.value === value) || null} onChange={(o) => onChange(o?.value || '')} />; break
        case 'color': control = <div className="flex gap-2"><input type="color" disabled={!canEdit} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600" /><Input disabled={!canEdit} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="#323a45" /></div>; break
        case 'password': control = <PasswordInput autoComplete="new-password" disabled={!canEdit} placeholder={secretSet ? tr("Saved. Type to replace it.") : ''} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />; break
        case 'taxes': { const opts = (taxes || []).map((t) => ({ value: t, label: `${t.replace('|', ' · ')}%` })); control = <Select isMulti isDisabled={!canEdit} options={opts} value={opts.filter((o) => (value || []).includes(o.value))} onChange={(o) => onChange((o || []).map((i) => i.value))} />; break }
        default: control = <Input disabled={!canEdit} value={value ?? ''} placeholder={x.ph} maxLength={x.max} onChange={(e) => onChange(e.target.value)} />
    }
    return <div className={wide ? 'md:col-span-2' : ''}><div className="mb-1.5 text-sm">{label}</div>{control}{hint}</div>
}
