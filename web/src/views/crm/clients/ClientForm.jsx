import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { TbArrowNarrowLeft, TbTrash } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import BottomStickyBar from '@/components/template/BottomStickyBar'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { Form, FormItem } from '@/components/ui/Form'
import ImageUpload from '@/components/crm/ImageUpload'
import { api, notify, useCan } from '../kit/api'
import { useClientLookups } from './shared'

const addr = { street: '', city: '', state: '', zip: '', country: null }
const blank = { logoUrl: null, industry: '', company: '', vat: '', phone: '', website: '', address: '', city: '', state: '', zip: '', country: null, language: '', currencyId: null, active: true, groupIds: [], adminIds: [], billing: { ...addr }, shipping: { ...addr }, contact: { firstName: '', lastName: '', email: '', phone: '', title: '' } }

const Address = ({ value, onChange, countries }) => (
    <div>
        <FormItem label="Street"><Input value={value.street || ''} onChange={(e) => onChange({ ...value, street: e.target.value })} /></FormItem>
        <div className="grid grid-cols-2 gap-x-4">
            <FormItem label="City"><Input value={value.city || ''} onChange={(e) => onChange({ ...value, city: e.target.value })} /></FormItem>
            <FormItem label="State"><Input value={value.state || ''} onChange={(e) => onChange({ ...value, state: e.target.value })} /></FormItem>
            <FormItem label="ZIP"><Input value={value.zip || ''} onChange={(e) => onChange({ ...value, zip: e.target.value })} /></FormItem>
            <FormItem label="Country"><Select isClearable options={countries} value={countries.find((o) => o.value === value.country) || null} onChange={(o) => onChange({ ...value, country: o ? o.value : null })} /></FormItem>
        </div>
    </div>
)

// Same layout as the template's customer form (overview + address on the left, image / tags / account on the right),
// with the Perfex client fields: VAT, industry, currency, language, groups, admins, billing and shipping addresses.
const ClientForm = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const can = useCan()
    const lookups = useClientLookups()
    const [v, setV] = useState(blank)
    const [loading, setLoading] = useState(!!id)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmDel, setConfirmDel] = useState(false)
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
    const remove = async () => {
        setConfirmDel(false)
        try { await api(`/api/crm/customers/${id}`, { method: 'DELETE' }); notify('success', 'Client deleted'); navigate('/crm/clients') } catch (e) { notify('danger', e.message) }
    }

    const groupOptions = lookups.groups.map((g) => ({ value: g.id, label: g.name }))
    const staffOptions = lookups.staff.map((s) => ({ value: s.id, label: s.name }))
    const currencyOptions = lookups.currencies.map((c) => ({ value: c.id, label: c.name }))

    if (loading) return <Container><div className="py-16 text-center text-gray-400">Loading…</div></Container>
    return (
        <Form className="flex h-full w-full" containerClassName="flex flex-col w-full justify-between" onSubmit={(e) => e.preventDefault()}>
            <Container>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                <div className="flex flex-col gap-4 md:flex-row">
                    <div className="flex flex-auto flex-col gap-4">
                        <Card>
                            <h4 className="mb-6">Overview</h4>
                            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                                <FormItem label="Company name" asterisk><Input value={v.company} placeholder="Company name" onChange={(e) => set({ company: e.target.value })} /></FormItem>
                                <FormItem label="VAT / ICE"><Input value={v.vat} onChange={(e) => set({ vat: e.target.value })} /></FormItem>
                                <FormItem label="Phone"><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></FormItem>
                                <FormItem label="Website"><Input type="url" value={v.website} onChange={(e) => set({ website: e.target.value })} /></FormItem>
                                <FormItem label="Industry"><Input placeholder="e.g. Real estate, Retail…" value={v.industry} onChange={(e) => set({ industry: e.target.value })} /></FormItem>
                                <FormItem label="Default currency"><Select isClearable options={currencyOptions} value={currencyOptions.find((o) => o.value === v.currencyId) || null} onChange={(o) => set({ currencyId: o ? o.value : null })} /></FormItem>
                                <FormItem label="Default language"><Input placeholder="e.g. french" value={v.language} onChange={(e) => set({ language: e.target.value })} /></FormItem>
                            </div>
                        </Card>
                        <Card>
                            <h4 className="mb-6">Address</h4>
                            <Address value={{ street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country }} countries={lookups.countries} onChange={(a) => set({ address: a.street, city: a.city, state: a.state, zip: a.zip, country: a.country })} />
                        </Card>
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <Card>
                                <div className="mb-4 flex items-center justify-between"><h4>Billing address</h4><Button size="xs" type="button" onClick={() => set({ billing: { street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country } })}>Same as address</Button></div>
                                <Address value={v.billing} countries={lookups.countries} onChange={(billing) => set({ billing })} />
                            </Card>
                            <Card>
                                <div className="mb-4 flex items-center justify-between"><h4>Shipping address</h4><Button size="xs" type="button" onClick={() => set({ shipping: { ...v.billing } })}>Same as billing</Button></div>
                                <Address value={v.shipping} countries={lookups.countries} onChange={(shipping) => set({ shipping })} />
                            </Card>
                        </div>
                        {!id && (
                            <Card>
                                <h4 className="mb-1">Primary contact</h4>
                                <p className="mb-5 text-sm text-gray-500">Optional — you can add contacts later from the client page.</p>
                                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                                    {[['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone'], ['title', 'Position']].map(([k, l]) => (
                                        <FormItem key={k} label={l}><Input value={v.contact[k]} onChange={(e) => set({ contact: { ...v.contact, [k]: e.target.value } })} /></FormItem>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="flex flex-col gap-4 md:w-[370px]">
                        <Card>
                            <h4 className="mb-6">Image</h4>
                            <div className="rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-700">
                                <div className="flex justify-center">
                                    {id ? <ImageUpload url={v.logoUrl} name={v.company} shape="circle" size={100} uploadUrl={`/api/crm/customers/${id}/logo`} onChange={(logoUrl) => set({ logoUrl })} /> : <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-white px-2 text-center text-xs text-gray-400 shadow dark:bg-gray-800">Add the logo after saving</div>}
                                </div>
                                <p className="mt-3 text-xs text-gray-500">The logo is optimised to WebP and shown on lists and the client page.</p>
                            </div>
                        </Card>
                        <Card>
                            <h4 className="mb-2">Client groups</h4>
                            <div className="mt-6"><Select isMulti isClearable placeholder="Add groups…" options={groupOptions} value={groupOptions.filter((o) => v.groupIds.includes(o.value))} onChange={(opts) => set({ groupIds: (opts || []).map((o) => o.value) })} /></div>
                        </Card>
                        <Card>
                            <h4 className="mb-2">Customer admins</h4>
                            <p className="text-sm text-gray-500">Staff who can see this client with “view own”.</p>
                            <div className="mt-4"><Select isMulti isClearable placeholder="Assign staff…" options={staffOptions} value={staffOptions.filter((o) => v.adminIds.includes(o.value))} onChange={(opts) => set({ adminIds: (opts || []).map((o) => o.value) })} /></div>
                        </Card>
                        <Card>
                            <h4>Account</h4>
                            <div className="mt-6 flex items-center justify-between gap-8">
                                <div><h6>Active</h6><p>Inactive clients stay in your records but are hidden from new documents.</p></div>
                                <Switcher checked={v.active} onChange={(a) => set({ active: a })} />
                            </div>
                        </Card>
                    </div>
                </div>
            </Container>
            <BottomStickyBar>
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <Button className="ltr:mr-3 rtl:ml-3" type="button" variant="plain" icon={<TbArrowNarrowLeft />} onClick={() => navigate(id ? `/crm/clients/${id}` : '/crm/clients')}>Back</Button>
                        <div className="flex items-center">
                            {id && can('customers', 'delete') && <Button className="ltr:mr-3 rtl:ml-3" type="button" customColorClass={() => 'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'} icon={<TbTrash />} onClick={() => setConfirmDel(true)}>Delete</Button>}
                            <Button variant="solid" type="button" loading={saving} onClick={save}>{id ? 'Save changes' : 'Create client'}</Button>
                        </div>
                    </div>
                </Container>
            </BottomStickyBar>
            <ConfirmDialog isOpen={confirmDel} type="danger" title="Delete this client?" confirmText="Delete" onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{v.company} and its contacts will be removed. Clients that still have invoices, estimates, contracts, projects or tickets cannot be deleted — deactivate them instead.</p>
            </ConfirmDialog>
        </Form>
    )
}

export default ClientForm
