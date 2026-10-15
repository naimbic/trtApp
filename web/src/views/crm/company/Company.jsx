import { useEffect, useMemo, useState } from 'react'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import ImageUpload from '@/components/crm/ImageUpload'
import { api, notify, useCan } from '../kit/api'
import { tr } from '@/utils/t'

const Field = ({ label, hint, children, className = '' }) => (
    <div className={className}><label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>{children}{hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}</div>
)

const Company = () => {
    const can = useCan()
    const canEdit = can('settings', 'edit')
    const [form, setForm] = useState(null)
    const [saved, setSaved] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => { api('/api/crm/company').then((d) => { setForm(d); setSaved(JSON.stringify(d)) }).catch((e) => setError(e.message)) }, [])
    const dirty = useMemo(() => !!form && JSON.stringify(form) !== saved, [form, saved])
    if (error) return <Container><Alert showIcon type="danger">{error}</Alert></Container>
    if (!form) return <Container><div className="flex h-60 items-center justify-center"><Spinner size={32} /></div></Container>

    const set = (patch) => setForm((f) => ({ ...f, ...patch }))
    const setImage = (k) => (url) => { set({ [k]: url || '' }); setSaved((x) => JSON.stringify({ ...JSON.parse(x), [k]: url || '' })) }
    const save = async () => {
        setSaving(true)
        try { const d = await api('/api/crm/company', { method: 'PUT', body: form }); setForm(d); setSaved(JSON.stringify(d)); notify('success', tr("Company details saved")) } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }

    return (
        <Container>
            <div className="mb-4"><h3>{tr("Company")}</h3><p className="text-sm text-gray-500">{tr("Your identity on invoices, estimates, emails and the client pages")}</p></div>
            <Card className="mb-4">
                <h5 className="mb-0.5">{tr("Logo & signature")}</h5>
                <p className="mb-5 text-sm text-gray-500">{tr("Images are optimised to WebP and stored in DigitalOcean Spaces. A transparent PNG works best for the logo.")}</p>
                <div className="flex flex-wrap gap-10">
                    <div className="flex flex-col items-center gap-2"><ImageUpload url={form.logo} name={form.name} shape="square" size={120} uploadUrl="/api/crm/company/image?kind=logo" canEdit={canEdit} onChange={setImage('logo')} /><span className="text-sm font-semibold">{tr("Logo")}</span><span className="max-w-[170px] text-center text-xs text-gray-400">{tr("Documents and emails")}</span></div>
                    <div className="flex flex-col items-center gap-2"><ImageUpload url={form.logoDark} name={form.name} shape="square" size={120} uploadUrl="/api/crm/company/image?kind=logoDark" canEdit={canEdit} onChange={setImage('logoDark')} /><span className="text-sm font-semibold">{tr("Logo for dark backgrounds")}</span><span className="max-w-[170px] text-center text-xs text-gray-400">{tr("Optional, light version")}</span></div>
                    <div className="flex flex-col items-center gap-2"><ImageUpload url={form.signature} name="Signature" shape="square" size={120} uploadUrl="/api/crm/company/image?kind=signature" canEdit={canEdit} onChange={setImage('signature')} /><span className="text-sm font-semibold">{tr("Signature")}</span><span className="max-w-[170px] text-center text-xs text-gray-400">{tr("For contracts and quotes")}</span></div>
                </div>
            </Card>
            <Card className="mb-4">
                <h5 className="mb-0.5">{tr("Company details")}</h5>
                <p className="mb-5 text-sm text-gray-500">{tr("Printed on your documents.")}</p>
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                    <Field label={tr("Legal name")}><Input disabled={!canEdit} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                    <Field label={tr("Brand name")} hint={tr("Used in emails and page titles")}><Input disabled={!canEdit} value={form.brand} onChange={(e) => set({ brand: e.target.value })} /></Field>
                    <Field label={tr("Address")} className="md:col-span-2"><Input disabled={!canEdit} value={form.address} onChange={(e) => set({ address: e.target.value })} /></Field>
                    <Field label={tr("City")}><Input disabled={!canEdit} value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                    <Field label={tr("Postal code")}><Input disabled={!canEdit} value={form.postcode} onChange={(e) => set({ postcode: e.target.value })} /></Field>
                    <Field label={tr("Phone")}><Input disabled={!canEdit} value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
                    <Field label={tr("Email")}><Input disabled={!canEdit} type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
                    <Field label={tr("Website")}><Input disabled={!canEdit} placeholder={tr("https://")} value={form.website} onChange={(e) => set({ website: e.target.value })} /></Field>
                    <Field label={tr("VAT / tax number")}><Input disabled={!canEdit} value={form.vat} onChange={(e) => set({ vat: e.target.value })} /></Field>
                    <Field label={tr("Details block on documents")} hint="One line per row: share capital, phone, RC / IF / ICE, bank details… This replaces the company block at the top of invoices and estimates." className="md:col-span-2">
                        <Input textArea rows={7} disabled={!canEdit} value={form.details} onChange={(e) => set({ details: e.target.value })} />
                    </Field>
                </div>
            </Card>
            {canEdit && dirty && (
                <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    <span className="text-sm text-gray-500">{tr("You have unsaved changes")}</span>
                    <div className="flex gap-2"><Button onClick={() => setForm(JSON.parse(saved))}>{tr("Discard")}</Button><Button variant="solid" loading={saving} onClick={save}>{tr("Save changes")}</Button></div>
                </div>
            )}
        </Container>
    )
}

export default Company
