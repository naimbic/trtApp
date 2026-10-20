/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbFileText, TbTrash, TbUpload, TbExternalLink } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Checkbox from '@/components/ui/Checkbox'
import Button from '@/components/ui/Button'
import ImageUpload from '@/components/crm/ImageUpload'
import { api, upload, notify } from '../kit/api'
import { usePayMoney } from './PayrollParts'
import { tr } from '@/utils/t'

const blank = {
    image: null, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', roleId: null, departmentIds: [], admin: false, active: true,
    hireDate: '', fireDate: '', salary: '', salaryCurrencyId: null, payDay: '', rib: '', cnss: false,
    bio: '', whatsapp: '', website: '', linkedin: '', password: '', applyRolePermissions: true, invite: false,
}
const PRIVATE = ['salary', 'salaryCurrencyId', 'payDay', 'rib', 'cnss'] // super administrators only
const day = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '')

const Field = ({ label, children, className = '' }) => <div className={className}><label className="form-label mb-1 block">{label}</label>{children}</div>
const Section = ({ title, hint, children }) => (
    <section className="mt-5 border-t border-gray-100 pt-4 first:mt-0 first:border-0 first:pt-0 dark:border-gray-700">
        <div className="mb-3 flex items-baseline justify-between gap-3"><h6 className="text-[13px] font-extrabold uppercase tracking-wide text-gray-500">{title}</h6>{hint && <span className="text-xs text-gray-400">{hint}</span>}</div>
        {children}
    </section>
)

/** A document of the member (CV or portfolio): upload, open, remove. */
const DocUpload = ({ memberId, kind, label, doc, onChanged }) => {
    const input = useRef(null)
    const [busy, setBusy] = useState(false)
    const send = async (file) => {
        if (!file) return
        setBusy(true)
        try {
            const f = new FormData(); f.append('file', file); f.append('kind', kind)
            await upload(`/api/crm/team/${memberId}/document`, f)
            notify('success', tr('File uploaded')); onChanged?.()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false); if (input.current) input.current.value = '' }
    }
    const remove = async () => {
        setBusy(true)
        try { await api(`/api/crm/team/${memberId}/document?kind=${kind}`, { method: 'DELETE' }); notify('success', tr('File removed')); onChanged?.() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 dark:border-gray-700">
            <TbFileText className="shrink-0 text-xl text-gray-400" />
            <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-500">{label}</div>
                {doc ? <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-sm font-semibold hover:underline">{doc.name}<TbExternalLink className="shrink-0" /></a> : <div className="text-sm text-gray-400">{tr('No file')}</div>}
            </div>
            <input ref={input} type="file" hidden onChange={(e) => send(e.target.files?.[0])} />
            <Button size="xs" icon={<TbUpload />} loading={busy} onClick={() => input.current?.click()}>{doc ? tr('Replace') : tr('Upload')}</Button>
            {doc && <button type="button" className="text-gray-400 hover:text-red-500" aria-label={tr('Remove')} disabled={busy} onClick={remove}><TbTrash /></button>}
        </div>
    )
}

/** Add or edit a team member, as a popup in the template's look. props: open, member (null = new), lookups {roles, departments}, canAdmin, saving, error, onSubmit(values), onClose(), onChanged() */
const MemberDrawer = ({ open, member, lookups, canAdmin, saving, error, onSubmit, onClose, onChanged }) => {
    const { options: currencyOptions, defaultId } = usePayMoney()
    const [v, setV] = useState(blank)
    const edit = !!member

    useEffect(() => {
        if (!open) return
        setV(member ? {
            ...blank, image: member.image, jobTitle: member.jobTitle || '', bio: member.bio || '', website: member.website || '', whatsapp: member.whatsapp || '', linkedin: member.linkedin || '',
            firstName: member.firstName || '', lastName: member.lastName || '', email: member.email || '', phone: member.phone || '', roleId: member.roleId || null,
            departmentIds: (member.departments || []).map((d) => d.id), admin: !!member.admin, active: member.active !== false,
            hireDate: day(member.hireDate), fireDate: day(member.fireDate),
            salary: member.salary ?? '', salaryCurrencyId: member.salaryCurrencyId || defaultId, payDay: member.payDay ?? '', rib: member.rib || '', cnss: !!member.cnss,
        } : { ...blank, salaryCurrencyId: defaultId })
    }, [open, member, defaultId])

    const roleOptions = (lookups.roles || []).map((r) => ({ value: r.id, label: r.name }))
    const deptOptions = (lookups.departments || []).map((d) => ({ value: d.id, label: d.name }))
    const set = (patch) => setV((p) => ({ ...p, ...patch }))
    const roleChanged = edit && (v.roleId || null) !== (member.roleId || null)
    const submit = () => {
        const out = { ...v }
        if (!canAdmin) PRIVATE.forEach((k) => delete out[k])
        onSubmit(out)
    }

    return (
        <Dialog isOpen={open} width={780} onClose={onClose} onRequestClose={onClose}>
            <div className="mb-4 flex items-center gap-4 pr-10">
                {edit && <ImageUpload url={v.image} name={`${v.firstName} ${v.lastName}`} size={64} uploadUrl={`/api/crm/team/${member.id}/avatar`} onChange={(image) => { set({ image }); onChanged?.() }} />}
                <div className="min-w-0 flex-1">
                    <h5 className="truncate">{edit ? tr('Edit {name}', { name: member.name }) : tr('Add team member')}</h5>
                    {edit && <div className="truncate text-sm text-gray-500">{member.email}</div>}
                </div>
                <label className="flex shrink-0 items-center gap-2 text-sm font-semibold">{tr('Active')}<Switcher checked={v.active} onChange={(c) => set({ active: c })} /></label>
            </div>
            <div className="max-h-[62vh] overflow-y-auto pr-1">
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}

                <Section title={tr('Identity')}>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Field label={`${tr('First name')} *`}><Input value={v.firstName} onChange={(e) => set({ firstName: e.target.value })} autoComplete="off" /></Field>
                        <Field label={tr('Last name')}><Input value={v.lastName} onChange={(e) => set({ lastName: e.target.value })} autoComplete="off" /></Field>
                        <Field label={`${tr('Email (used to sign in)')} *`} className="col-span-2"><Input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" /></Field>
                        <Field label={tr('Phone')}><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
                        <Field label={tr('WhatsApp')}><Input value={v.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
                        {edit && <Field label={tr('Job title')} className="col-span-2"><Input value={v.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} placeholder={tr('e.g. Account manager')} /></Field>}
                    </div>
                </Section>

                <Section title={tr('Position')}>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Field label={tr('Role')} className="col-span-2"><Select isClearable placeholder={tr('No role')} options={roleOptions} value={roleOptions.find((o) => o.value === v.roleId) || null} onChange={(o) => set({ roleId: o?.value || null })} /></Field>
                        <Field label={tr('Hire date')}><Input type="date" value={v.hireDate} onChange={(e) => set({ hireDate: e.target.value })} /></Field>
                        <Field label={tr('Fire date')}><Input type="date" value={v.fireDate} min={v.hireDate || undefined} onChange={(e) => set({ fireDate: e.target.value })} /></Field>
                        <Field label={tr('Departments')} className="col-span-2 md:col-span-4"><Select isMulti placeholder={tr('Select departments')} options={deptOptions} value={deptOptions.filter((o) => v.departmentIds.includes(o.value))} onChange={(opts) => set({ departmentIds: (opts || []).map((o) => o.value) })} /></Field>
                    </div>
                    {roleChanged && (
                        <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                            <Checkbox checked={v.applyRolePermissions} onChange={(c) => set({ applyRolePermissions: c })} />
                            <span>{tr("Replace this member's permissions with the new role's defaults")}</span>
                        </div>
                    )}
                </Section>

                {canAdmin && (
                    <Section title={tr('Pay')} hint={tr('Only super administrators see this')}>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <Field label={tr('Monthly salary')}><Input type="number" min="0" step="0.01" value={v.salary} onChange={(e) => set({ salary: e.target.value })} /></Field>
                            <Field label={tr('Currency')}><Select options={currencyOptions} value={currencyOptions.find((o) => o.value === v.salaryCurrencyId) || null} onChange={(o) => set({ salaryCurrencyId: o?.value || null })} /></Field>
                            <Field label={tr('Paid on day')}><Input type="number" min="1" max="31" placeholder="10" value={v.payDay} onChange={(e) => set({ payDay: e.target.value })} /></Field>
                            <Field label={tr('CNSS')}><div className="flex h-11 items-center gap-2"><Switcher checked={v.cnss} onChange={(c) => set({ cnss: c })} /><span className="text-sm text-gray-500">{v.cnss ? tr('Declared') : tr('Not declared')}</span></div></Field>
                            <Field label={tr('RIB (bank account)')} className="col-span-2 md:col-span-4"><Input placeholder="000 000 0000000000000000 00" value={v.rib} onChange={(e) => set({ rib: e.target.value })} autoComplete="off" /></Field>
                        </div>
                    </Section>
                )}

                {edit && (
                    <Section title={tr('Documents')}>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <DocUpload memberId={member.id} kind="cv" label={tr('CV')} doc={member.cv} onChanged={onChanged} />
                            <DocUpload memberId={member.id} kind="portfolio" label={tr('Portfolio file')} doc={member.portfolioFile} onChanged={onChanged} />
                        </div>
                    </Section>
                )}

                {edit && (
                    <Section title={tr('About and links')}>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Field label={tr('About')} className="md:col-span-2"><Input textArea rows={2} maxLength={500} value={v.bio} onChange={(e) => set({ bio: e.target.value })} /></Field>
                            <Field label={tr('Portfolio')}><Input placeholder={tr('https://')} value={v.website} onChange={(e) => set({ website: e.target.value })} /></Field>
                            <Field label={tr('LinkedIn')}><Input placeholder={tr('https://linkedin.com/in/…')} value={v.linkedin} onChange={(e) => set({ linkedin: e.target.value })} /></Field>
                        </div>
                    </Section>
                )}

                {!edit && (
                    <Section title={tr('Access')}>
                        <div className="flex items-center justify-between gap-4">
                            <div><div className="font-semibold">{tr('Invite by link')}</div><div className="text-sm text-gray-500">{tr('The member chooses their own password through a one-time link (valid 7 days)')}</div></div>
                            <Switcher checked={v.invite} onChange={(c) => set({ invite: c, password: '' })} />
                        </div>
                        {!v.invite && (
                            <Field label={tr('Password')} className="mt-3"><Input type="password" autoComplete="new-password" value={v.password} onChange={(e) => set({ password: e.target.value })} placeholder={tr('Min. 8 characters')} /><div className="mt-1 text-xs text-gray-400">{tr('Leave empty to generate a one-time password')}</div></Field>
                        )}
                    </Section>
                )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <Button onClick={onClose}>{tr('Cancel')}</Button>
                <Button variant="solid" loading={saving} onClick={submit}>{edit ? tr('Save changes') : tr('Create member')}</Button>
            </div>
        </Dialog>
    )
}

export default MemberDrawer
