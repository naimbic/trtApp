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
import { tr } from '@/utils/t'
import BankAccountSelect from '../kit/BankAccountSelect'

const addr = { street: '', city: '', state: '', zip: '', country: null }
const blank = { incomeExcluded: false, diffBilling: false, logoUrl: null, industry: '', company: '', vat: '', phone: '', website: '', address: '', city: '', state: '', zip: '', country: null, language: '', currencyId: null, bankAccountId: null, portalHidden: [], active: true, groupIds: [], adminIds: [], billing: { ...addr }, shipping: { ...addr }, contact: { firstName: '', lastName: '', email: '', phone: '', title: '' } }

const norm = (x) => String(x ?? '').trim().toLowerCase()
const sameAddress = (a, b) => ['street', 'city', 'state', 'zip'].every((k) => norm(a?.[k]) === norm(b?.[k])) && String(a?.country ?? '') === String(b?.country ?? '')
const isBlankAddress = (a) => !['street', 'city', 'state', 'zip'].some((k) => norm(a?.[k])) && !a?.country

const Address = ({ value, onChange, countries }) => (
    <div>
        <FormItem label={tr("Street")}><Input value={value.street || ''} onChange={(e) => onChange({ ...value, street: e.target.value })} /></FormItem>
        <div className="grid grid-cols-2 gap-x-4">
            <FormItem label={tr("City")}><Input value={value.city || ''} onChange={(e) => onChange({ ...value, city: e.target.value })} /></FormItem>
            <FormItem label={tr("State")}><Input value={value.state || ''} onChange={(e) => onChange({ ...value, state: e.target.value })} /></FormItem>
            <FormItem label={tr("ZIP")}><Input value={value.zip || ''} onChange={(e) => onChange({ ...value, zip: e.target.value })} /></FormItem>
            <FormItem label={tr("Country")}><Select isClearable options={countries} value={countries.find((o) => o.value === value.country) || null} onChange={(o) => onChange({ ...value, country: o ? o.value : null })} /></FormItem>
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
            const main = { street: c.address || '', city: c.city || '', state: c.state || '', zip: c.zip || '', country: c.country ?? null }
            const bil = { street: c.billing.street || '', city: c.billing.city || '', state: c.billing.state || '', zip: c.billing.zip || '', country: c.billing.country ?? null }
            // a billing address that is empty or the same as the address above is just "the same": its fields stay hidden
            const differs = (x, ref) => !sameAddress(x, ref) && !isBlankAddress(x)
            setV({ ...blank, diffBilling: differs(bil, main), logoUrl: c.logoUrl || null, industry: c.industry || '', company: c.company || '', vat: c.vat || '', phone: c.phone || '', website: c.website || '', address: c.address || '', city: c.city || '', state: c.state || '', zip: c.zip || '', country: c.country ?? null, language: c.language || '', bankAccountId: c.bankAccountId || null, portalHidden: c.portalHidden || [], currencyId: c.currencyId || null, active: c.active, incomeExcluded: !!c.incomeExcluded, groupIds: c.groups.map((g) => g.id), adminIds: c.admins.map((a) => a.id), billing: { street: c.billing.street || '', city: c.billing.city || '', state: c.billing.state || '', zip: c.billing.zip || '', country: c.billing.country ?? null }, shipping: { street: c.shipping.street || '', city: c.shipping.city || '', state: c.shipping.state || '', zip: c.shipping.zip || '', country: c.shipping.country ?? null } })
        }).catch((e) => setError(e.message)).finally(() => setLoading(false))
    }, [id])

    const save = async () => {
        if (!v.company.trim()) return setError(tr("Company name is required"))
        setSaving(true)
        setError('')
        try {
            const body = { ...v }
            // with the switch off, billing is simply the address above (shipping is not used: it is left as it is)
            const main = { street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country }
            body.billing = v.diffBilling ? v.billing : { ...main }
            delete body.shipping
            delete body.diffBilling
            delete body.logoUrl
            if (id) delete body.contact
            const res = id ? await api(`/api/crm/customers/${id}`, { method: 'PATCH', body }) : await api('/api/crm/customers', { method: 'POST', body })
            notify('success', id ? tr("Client saved") : tr("Client created"))
            navigate(`/crm/clients/${res.id}`)
        } catch (e) {
            setError(e.message)
            setSaving(false)
        }
    }
    const remove = async () => {
        setConfirmDel(false)
        try { await api(`/api/crm/customers/${id}`, { method: 'DELETE' }); notify('success', tr("Client deleted")); navigate('/crm/clients') } catch (e) { notify('danger', e.message) }
    }

    const groupOptions = lookups.groups.map((g) => ({ value: g.id, label: g.name }))
    const staffOptions = lookups.staff.map((s) => ({ value: s.id, label: s.name }))
    const currencyOptions = lookups.currencies.map((c) => ({ value: c.id, label: c.name }))
    const languageOptions = (lookups.languages || []).map((l) => ({ value: l, label: l.charAt(0).toUpperCase() + l.slice(1) })) // only the languages switched on in the settings

    if (loading) return <Container><div className="py-16 text-center text-gray-400">{tr("Loading…")}</div></Container>
    return (
        <Form className="flex h-full w-full" containerClassName="flex flex-col w-full justify-between" onSubmit={(e) => e.preventDefault()}>
            <Container>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
                <div className="flex flex-col gap-4 md:flex-row">
                    <div className="flex flex-auto flex-col gap-4">
                        <Card>
                            <h4 className="mb-6">{tr("Overview")}</h4>
                            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                                <FormItem label={tr("Company name")} asterisk><Input value={v.company} placeholder={tr("Company name")} onChange={(e) => set({ company: e.target.value })} /></FormItem>
                                <FormItem label={tr("VAT / ICE")}><Input value={v.vat} onChange={(e) => set({ vat: e.target.value })} /></FormItem>
                                <FormItem label={tr("Phone")}><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></FormItem>
                                <FormItem label={tr("Website")}><Input type="url" value={v.website} onChange={(e) => set({ website: e.target.value })} /></FormItem>
                                <FormItem label={tr("Industry")}><Input placeholder={tr("e.g. Real estate, Retail…")} value={v.industry} onChange={(e) => set({ industry: e.target.value })} /></FormItem>
                                <FormItem label={tr("Default currency")}><Select isClearable options={currencyOptions} value={currencyOptions.find((o) => o.value === v.currencyId) || null} onChange={(o) => set({ currencyId: o ? o.value : null })} /></FormItem>
                                <FormItem label={tr("Bank account on its documents")}><BankAccountSelect value={v.bankAccountId} onChange={(id) => set({ bankAccountId: id })} emptyLabel={tr("The company's default account")} /></FormItem>
                                <FormItem label={tr("Default language")}><Select isClearable placeholder={tr("Company language")} options={languageOptions} value={v.language ? languageOptions.find((o) => o.value === v.language.toLowerCase()) || { value: v.language, label: v.language } : null} onChange={(o) => set({ language: o?.value || '' })} /></FormItem>
                            </div>
                        </Card>
                        <Card>
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                                <h4>{tr("Address")}</h4>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500"><span>{tr("Different billing address")}</span><Switcher checked={!!v.diffBilling} onChange={(c) => set({ diffBilling: c, ...(c && isBlankAddress(v.billing) ? { billing: { street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country } } : {}) })} /></label>
                                </div>
                            </div>
                            <Address value={{ street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country }} countries={lookups.countries} onChange={(a) => set({ address: a.street, city: a.city, state: a.state, zip: a.zip, country: a.country })} />
                            {v.diffBilling && (
                                <div className={`mt-5 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-gray-100 pt-5 dark:border-gray-700 `}>
                                    {v.diffBilling && (
                                        <div>
                                            <div className="mb-3 flex items-center justify-between"><h5>{tr("Billing address")}</h5><Button size="xs" type="button" onClick={() => set({ billing: { street: v.address, city: v.city, state: v.state, zip: v.zip, country: v.country } })}>{tr("Copy the address")}</Button></div>
                                            <Address value={v.billing} countries={lookups.countries} onChange={(billing) => set({ billing })} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                        {!id && (
                            <Card>
                                <h4 className="mb-1">{tr("Primary contact")}</h4>
                                <p className="mb-5 text-sm text-gray-500">{tr("Optional — you can add contacts later from the client page.")}</p>
                                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                                    {[['firstName', tr("First name")], ['lastName', tr("Last name")], ['email', tr("Email")], ['phone', tr("Phone")], ['title', tr("Position")]].map(([k, l]) => (
                                        <FormItem key={k} label={l}><Input value={v.contact[k]} onChange={(e) => set({ contact: { ...v.contact, [k]: e.target.value } })} /></FormItem>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="flex flex-col gap-4 md:w-[370px]">
                        <Card>
                            <h4 className="mb-6">{tr("Image")}</h4>
                            <div className="rounded-lg bg-gray-100 p-4 text-center dark:bg-gray-700">
                                <div className="flex justify-center">
                                    {id ? <ImageUpload url={v.logoUrl} name={v.company} shape="circle" size={100} uploadUrl={`/api/crm/customers/${id}/logo`} onChange={(logoUrl) => set({ logoUrl })} /> : <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-white px-2 text-center text-xs text-gray-400 shadow dark:bg-gray-800">{tr("Add the logo after saving")}</div>}
                                </div>
                                <p className="mt-3 text-xs text-gray-500">{tr("The logo is optimised to WebP and shown on lists and the client page.")}</p>
                            </div>
                        </Card>
                        <Card>
                            <h4 className="mb-2">{tr("Client groups")}</h4>
                            <div className="mt-6"><Select isMulti isClearable placeholder={tr("Add groups…")} options={groupOptions} value={groupOptions.filter((o) => v.groupIds.includes(o.value))} onChange={(opts) => set({ groupIds: (opts || []).map((o) => o.value) })} /></div>
                        </Card>
                        <Card>
                            <h4 className="mb-2">{tr("Customer admins")}</h4>
                            <p className="text-sm text-gray-500">{tr("Staff who can see this client with “view own”.")}</p>
                            <div className="mt-4"><Select isMulti isClearable placeholder={tr("Assign staff…")} options={staffOptions} value={staffOptions.filter((o) => v.adminIds.includes(o.value))} onChange={(opts) => set({ adminIds: (opts || []).map((o) => o.value) })} /></div>
                        </Card>
                        <Card>
                            <h4>{tr("Client area access")}</h4>
                            <p className="text-sm text-gray-500">{tr("The sections this client sees after signing in to its client area. Switch one off to hide it for all its contacts.")}</p>
                            <div className="mt-4 grid gap-2.5">
                                {[['invoices', tr("Invoices")], ['estimates', tr("Estimates")], ['proposals', tr("Proposals")], ['contracts', tr("Contracts")], ['projects', tr("Projects")], ['support', tr("Support")]].map(([key, label]) => (
                                    <label key={key} className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><Switcher checked={!(v.portalHidden || []).includes(key)} onChange={(on) => set({ portalHidden: on ? (v.portalHidden || []).filter((x) => x !== key) : [...(v.portalHidden || []), key] })} /></label>
                                ))}
                            </div>
                        </Card>
                        <Card>
                            <h4>{tr("Account")}</h4>
                            <div className="mt-6 flex items-center justify-between gap-8">
                                <div><h6>{tr("Active")}</h6><p>{tr("Inactive clients stay in your records but are hidden from new documents.")}</p></div>
                                <Switcher checked={v.active} onChange={(a) => set({ active: a })} />
                            </div>
                            <div className="mt-6 flex items-center justify-between gap-8">
                                <div><h6>{tr("Freelance / personal client")}</h6><p>{tr("Active, but not company income: no invoices, estimates, proposals or purchase orders (so no company numbers are used), and nothing from this client in the dashboard, reports or goals.")}</p></div>
                                <Switcher checked={!!v.incomeExcluded} onChange={(a) => set({ incomeExcluded: a })} />
                            </div>
                        </Card>
                    </div>
                </div>
            </Container>
            <BottomStickyBar>
                <Container>
                    <div className="flex items-center justify-between px-8">
                        <Button className="ltr:mr-3 rtl:ml-3" type="button" variant="plain" icon={<TbArrowNarrowLeft />} onClick={() => navigate(id ? `/crm/clients/${id}` : '/crm/clients')}>{tr("Back")}</Button>
                        <div className="flex items-center">
                            {id && can('customers', 'delete') && <Button className="ltr:mr-3 rtl:ml-3" type="button" customColorClass={() => 'border-error ring-1 ring-error text-error hover:border-error hover:ring-error hover:text-error bg-transparent'} icon={<TbTrash />} onClick={() => setConfirmDel(true)}>{tr("Delete")}</Button>}
                            <Button variant="solid" type="button" loading={saving} onClick={save}>{id ? tr("Save changes") : tr("Create client")}</Button>
                        </div>
                    </div>
                </Container>
            </BottomStickyBar>
            <ConfirmDialog isOpen={confirmDel} type="danger" title={tr("Delete this client?")} confirmText={tr("Delete")} onClose={() => setConfirmDel(false)} onRequestClose={() => setConfirmDel(false)} onCancel={() => setConfirmDel(false)} onConfirm={remove}>
                <p>{v.company} {tr("and its contacts will be removed. Clients that still have invoices, estimates, contracts, projects or tickets cannot be deleted — deactivate them instead.")}</p>
            </ConfirmDialog>
        </Form>
    )
}

export default ClientForm
