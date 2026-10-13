import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { Form, FormItem } from '@/components/ui/Form'
import ImageUpload from '@/components/crm/ImageUpload'
import { api, notify } from '../kit/api'
import { useClientLookups } from './shared'

const addr = { street: '', city: '', state: '', zip: '', country: null }
const blank = { logoUrl: null, industry: '', company: '', vat: '', phone: '', website: '', address: '', city: '', state: '', zip: '', country: null, language: '', currencyId: null, active: true, groupIds: [], adminIds: [], billing: { ...addr }, shipping: { ...addr }, contact: { firstName: '', lastName: '', email: '', phone: '', title: '' } }

const Address = ({ title, value, onChange, countries }) => (
    <div>
        <h6 className="mb-3 text-gray-500">{title}</h6>
        <FormItem label="Street"><Input value={value.street || ''} onChange={(e) => onChange({ ...value, street: e.target.value })} /></FormItem>
        <div className="grid grid-cols-2 gap-x-4">
            <FormItem label="City"><Input value={value.city || ''} onChange={(e) => onChange({ ...value, city: e.target.value })} /></FormItem>
            <FormItem label="State"><Input value={value.state || ''} onChange={(e) => onChange({ ...value, state: e.target.value })} /></FormItem>
            <FormItem label="ZIP"><Input value={value.zip || ''} onChange={(e) => onChange({ ...value, zip: e.target.value })} /></FormItem>
            <FormItem label="Country"><Select isClearable options={countries} value={countries.find((o) => o.value === value.country) || null} onChange={(o) => onChange({ ...value, country: o ? o.value : null })} /></FormItem>
        </div>
    </div>
)

const ClientForm = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const lookups = useClientLookups()
    const [v, setV] = useState(blank)
    const [loading, setLoading] = useState(!!id)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const set = (patch) => setV((s) => ({ ...s, ...patch }))

    useEffect(() => {
        if (!id) return
        api(`/api/crm/customers/${id}`).then((c) => {
            setV({ ...blank, logoUrl: c.logoUrl || null, industry: c.industry || '', company: c.company || '', vat: c.vat || '', phone: c.phone || '', website: c.website || '', address: c.address || '', city: c.city || '', state: c.state || '', zip: c.zip || '', country: c.country ?? null, language: c.language || '', currencyId: c.currencyId || null, active: c.active, groupIds: c.groups.map((g) => g.id), adminIds: c.admins.map((a) => a.id), billing: { street: c.billing.street || '', city: c.billing.city || '', state: c.billing.state || '', zip: c.billing.zip || '', country: c.billing.country ?? null }, shipping: { street: c.shipping.street || '', city: c.shipping.city || '', state: c.shipping.state || '', zip: c.shipping.zip || '', country: c.shipping.country ?? null } })
        }).catch((e) => setError(e.message)).finally(() => setLoading(false))
    }, [id])

    const save = async () => {
        if (!v.company.trim()) return setError('Company name is required')
        setSaving(true)
        setError('')
        try {
            const body = { ...v }
            delete body.logoUrl
            if (id) delete body.contact
            const res = id ? await api(`/api/crm/customers/${id}`, { method: 'PATCH', body }) : await api('/api/crm/customers', { method: 'POST', body })
            notify('success', id ? 'Client saved' : 'Client created')
            navigate(`/crm/clients/${res.id}`)
        } catch (e) {
            setError(e.message)
            setSaving(false)
        }
    }

    const groupOptions = lookups.groups.map((g) => ({ value: g.id, label: g.name }))
    const staffOptions = lookups.staff.map((s) => ({ value: s.id, label: s.name }))
    const currencyOptions = lookups.currencies.map((c) => ({ value: c.id, label: c.name }))

    return (
        <Container>
            <div className="mb-4"><h3>{id ? 'Edit client' : 'New client'}</h3></div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            {loading ? <div className="py-16 text-center text-gray-400">Loading…</div> : (
                <Form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
                    <Card>
                        <div className="mb-5 flex items-center gap-5">
                            {id ? <ImageUpload url={v.logoUrl} name={v.company} shape="square" size={88} uploadUrl={`/api/crm/customers/${id}/logo`} onChange={(logoUrl) => set({ logoUrl })} /> : <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-gray-100 text-center text-[11px] text-gray-400 dark:bg-gray-700">Logo after saving</div>}
                            <div><h5>Company</h5><p className="text-sm text-gray-500">The logo is optimised to WebP and shown on the client page and lists.</p></div>
                        </div>
                        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                            <FormItem label="Company name" asterisk><Input value={v.company} onChange={(e) => set({ company: e.target.value })} /></FormItem>
                            <FormItem label="VAT / ICE"><Input value={v.vat} onChange={(e) => set({ vat: e.target.value })} /></FormItem>
                            <FormItem label="Phone"><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></FormItem>
                            <FormItem label="Industry"><Input placeholder="e.g. Real estate, Retail…" value={v.industry} onChange={(e) => set({ industry: e.target.value })} /></FormItem>
                            <FormItem label="Website"><Input type="url" value={v.website} onChange={(e) => set({ website: e.target.value })} /></FormItem>
                            <FormItem label="Default currency"><Select isClearable options={currencyOptions} value={currencyOptions.find((o) => o.value === v.currencyId) || null} onChange={(o) => set({ currencyId: o ? o.value : null })} /></FormItem>
                            <FormItem label="Default language"><Input placeholder="e.g. french" value={v.language} onChange={(e) => set({ language: e.target.value })} /></FormItem>
                            <FormItem label="Groups"><Select isMulti options={groupOptions} value={groupOptions.filter((o) => v.groupIds.includes(o.value))} onChange={(opts) => set({ groupIds: (opts || []).map((o) => o.value) })} /></FormItem>
                            <FormItem label="Customer admins (can see this client with “view own”)"><Select isMulti options={staffOptions} value={staffOptions.filter((o) => v.adminIds.includes(o.value))} onChange={(opts) => set({ adminIds: (opts || []).map((o) => o.value) })} /></FormItem>
                        </div>
                        <div className="mt-2 flex items-center gap-3"><Switcher checked={v.active} onChange={(a) => set({ active: a })} /><span>{v.active ? 'Active' : 'Inactive'}</span></div>
                    </Card>
                    <Card>
                        <h5 className="mb-4">Address</h5>
                        <Address title="" value={{ street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country }} countries={lookups.countries} onChange={(a) => set({ address: a.street, city: a.city, state: a.state, zip: a.zip, country: a.country })} />
                    </Card>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <Card>
                            <div className="mb-2 flex items-center justify-between"><h5>Billing address</h5><Button size="xs" onClick={() => set({ billing: { street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country } })}>Same as address</Button></div>
                            <Address title="" value={v.billing} countries={lookups.countries} onChange={(billing) => set({ billing })} />
                        </Card>
                        <Card>
                            <div className="mb-2 flex items-center justify-between"><h5>Shipping address</h5><Button size="xs" onClick={() => set({ shipping: { ...v.billing } })}>Same as billing</Button></div>
                            <Address title="" value={v.shipping} countries={lookups.countries} onChange={(shipping) => set({ shipping })} />
                        </Card>
                    </div>
                    {!id && (
                        <Card>
                            <h5 className="mb-1">Primary contact</h5>
                            <p className="mb-4 text-sm text-gray-500">Optional — you can add contacts later from the client page.</p>
                            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                                {[['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone'], ['title', 'Position']].map(([k, l]) => (
                                    <FormItem key={k} label={l}><Input value={v.contact[k]} onChange={(e) => set({ contact: { ...v.contact, [k]: e.target.value } })} /></FormItem>
                                ))}
                            </div>
                        </Card>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => navigate(id ? `/crm/clients/${id}` : '/crm/clients')}>Cancel</Button>
                        <Button variant="solid" loading={saving} onClick={save}>{id ? 'Save changes' : 'Create client'}</Button>
                    </div>
                </Form>
            )}
        </Container>
    )
}

export default ClientForm
