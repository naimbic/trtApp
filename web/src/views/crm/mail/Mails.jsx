import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TbSearch } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import AdaptiveCard from '@/components/shared/AdaptiveCard'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tabs from '@/components/ui/Tabs'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import Pagination from '@/components/ui/Pagination'
import cn from '@/utils/classNames'
import { api, notify, useCan } from '../kit/api'

const { TabList, TabNav } = Tabs
const { Tr, Th, Td, THead, TBody } = Table
const Label = ({ children }) => <label className="form-label mb-2 block">{children}</label>

/* Merge fields available per template family, as in Perfex. */
const FIELDS = {
    common: ['companyname', 'crm_url', 'main_domain', 'email_signature', 'client_company', 'contact_firstname', 'contact_lastname', 'contact_email'],
    invoice: ['invoice_number', 'invoice_link', 'invoice_date', 'invoice_duedate', 'invoice_status', 'invoice_total', 'invoice_subtotal', 'invoice_amount_due', 'payment_total', 'payment_date'],
    estimate: ['estimate_number', 'estimate_link', 'estimate_date', 'estimate_expirydate', 'estimate_status', 'estimate_total', 'estimate_subtotal', 'estimate_reference_no'],
    proposals: ['proposal_number', 'proposal_subject', 'proposal_proposal_to', 'proposal_link', 'proposal_open_till', 'proposal_status', 'proposal_total'],
    contract: ['contract_subject', 'contract_description', 'contract_datestart', 'contract_dateend', 'contract_contract_value', 'contract_type', 'contract_link'],
}
const TYPE_LABEL = { invoice: 'Invoices', estimate: 'Estimates', proposals: 'Proposals', contract: 'Contracts', client: 'Customers', staff: 'Staff', tasks: 'Tasks', ticket: 'Tickets', project: 'Projects', leads: 'Leads', credit_note: 'Credit notes', subscriptions: 'Subscriptions' }
const typeLabel = (t) => TYPE_LABEL[t] || (t || 'Other').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/* ---------------- Templates ---------------- */
const Templates = () => {
    const can = useCan()
    const [list, setList] = useState({ list: [], languages: [], types: [], language: '' })
    const [language, setLanguage] = useState(null)
    const [type, setType] = useState(null)
    const [search, setSearch] = useState('')
    const [sel, setSel] = useState(null)
    const [form, setForm] = useState(null)
    const [preview, setPreview] = useState('')
    const [saving, setSaving] = useState(false)
    const [testTo, setTestTo] = useState('')
    const [testing, setTesting] = useState(false)
    const area = useRef(null)
    const editable = can('email_templates', 'edit')

    const load = useCallback(async () => {
        const q = new URLSearchParams(); if (language) q.set('language', language); if (type) q.set('type', type); if (search.trim()) q.set('query', search.trim())
        const d = await api(`/api/crm/mail/templates?${q}`); setList(d)
    }, [language, type, search])
    useEffect(() => { const t = setTimeout(() => load().catch((e) => notify('danger', e.message)), 250); return () => clearTimeout(t) }, [load])

    const open = async (row) => {
        setSel(row.id)
        const full = await api(`/api/crm/email-templates/${row.id}`)
        setForm({ id: row.id, name: full.name, type: full.type, slug: full.slug, subject: full.subject || '', message: full.message || '', fromName: full.fromName || '', active: full.active !== false })
    }
    useEffect(() => {
        if (!form) return
        const t = setTimeout(() => api('/api/crm/mail/preview', { method: 'POST', body: { subject: form.subject, message: form.message } }).then((p) => setPreview(p.html)).catch(() => {}), 400)
        return () => clearTimeout(t)
    }, [form?.subject, form?.message, form?.id])

    const save = async () => {
        setSaving(true)
        try {
            await api(`/api/crm/email-templates/${form.id}`, { method: 'PUT', body: { subject: form.subject, message: form.message, fromName: form.fromName, active: form.active } })
            notify('success', 'Template saved'); load()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const sendTest = async () => {
        setTesting(true)
        try { await api('/api/crm/mail/test-template', { method: 'POST', body: { subject: form.subject, message: form.message, to: testTo } }); notify('success', `Test sent to ${testTo}`) } catch (e) { notify('danger', e.message) } finally { setTesting(false) }
    }
    const insert = (f) => {
        const el = area.current
        const tag = `{${f}}`
        if (!el) return setForm({ ...form, message: form.message + tag })
        const s = el.selectionStart ?? form.message.length, e = el.selectionEnd ?? s
        setForm({ ...form, message: form.message.slice(0, s) + tag + form.message.slice(e) })
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + tag.length, s + tag.length) })
    }
    const fields = [...(FIELDS[form?.type] || []), ...FIELDS.common]
    const typeOpts = list.types.map((t) => ({ value: t, label: typeLabel(t) }))
    const langOpts = list.languages.map((l) => ({ value: l, label: l.replace(/_/g, ' ') }))
    const grouped = list.list.reduce((a, r) => { (a[r.type || 'other'] ??= []).push(r); return a }, {})

    return (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="flex flex-col gap-3">
                <Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                    <Select size="sm" isClearable placeholder="All types" options={typeOpts} value={typeOpts.find((o) => o.value === type) || null} onChange={(o) => setType(o ? o.value : null)} />
                    <Select size="sm" options={langOpts} value={langOpts.find((o) => o.value === (language || list.language)) || null} onChange={(o) => o && setLanguage(o.value)} />
                </div>
                <div className="max-h-[640px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-600">
                    {Object.entries(grouped).map(([t, rows]) => (
                        <div key={t}>
                            <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700">{typeLabel(t)}</div>
                            {rows.map((r) => (
                                <button key={r.id} type="button" onClick={() => open(r)} className={cn('block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50', sel === r.id && 'bg-primary/10')}>
                                    <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{r.name}</span>{!r.active && <Tag className="bg-gray-200 text-gray-600">Off</Tag>}</div>
                                    <div className="truncate text-xs text-gray-500">{r.subject}</div>
                                </button>
                            ))}
                        </div>
                    ))}
                    {!list.list.length && <div className="p-6 text-center text-sm text-gray-400">No templates</div>}
                </div>
            </div>

            <div>
                {!form ? <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400 dark:border-gray-600">Choose a template to edit</div> : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1"><h5 className="truncate">{form.name}</h5><p className="text-xs text-gray-500">{typeLabel(form.type)} · {form.slug}</p></div>
                            <div className="flex items-center gap-2 text-sm">Active<Switcher checked={form.active} disabled={!editable} onChange={(v) => setForm({ ...form, active: v })} /></div>
                            {editable && <Button variant="solid" loading={saving} onClick={save}>Save</Button>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><Label>Subject</Label><Input disabled={!editable} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                            <div><Label>From name</Label><Input disabled={!editable} value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} /></div>
                        </div>
                        <div>
                            <Label>Available merge fields <span className="font-normal text-gray-400">(click to insert)</span></Label>
                            <div className="flex flex-wrap gap-1.5">
                                {fields.map((f) => <button key={f} type="button" disabled={!editable} onClick={() => insert(f)} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary dark:bg-gray-700">{`{${f}}`}</button>)}
                            </div>
                        </div>
                        <div className="grid gap-4 xl:grid-cols-2">
                            <div><Label>Message (HTML)</Label><textarea ref={area} disabled={!editable} spellCheck={false} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input h-[460px] w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-xs dark:border-gray-600 dark:bg-gray-800" /></div>
                            <div><Label>Preview <span className="font-normal text-gray-400">(sample data)</span></Label><iframe title="Template preview" sandbox="" srcDoc={preview} className="h-[460px] w-full rounded-xl border border-gray-200 bg-white dark:border-gray-600" /></div>
                        </div>
                        {editable && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-64"><Input size="sm" placeholder="Send a test to…" value={testTo} onChange={(e) => setTestTo(e.target.value)} /></div>
                                <Button size="sm" loading={testing} disabled={!testTo.trim()} onClick={sendTest}>Send test</Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

/* ---------------- Settings ---------------- */
const Settings = () => {
    const can = useCan()
    const editable = can('email_templates', 'edit')
    const [s, setS] = useState(null)
    const [password, setPassword] = useState('')
    const [testTo, setTestTo] = useState('')
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    useEffect(() => { api('/api/crm/mail/settings').then(setS).catch((e) => setError(e.message)) }, [])
    if (error) return <Alert showIcon type="danger">{error}</Alert>
    if (!s) return <div className="py-10 text-center text-gray-400">Loading…</div>
    const set = (k, v) => setS({ ...s, [k]: v })
    const save = async () => {
        setBusy('save')
        try { await api('/api/crm/mail/settings', { method: 'PUT', body: { ...s, password } }); setPassword(''); setS(await api('/api/crm/mail/settings')); notify('success', 'Mail settings saved') } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const test = async () => {
        setBusy('test')
        try { await api('/api/crm/mail/test', { method: 'POST', body: { to: testTo.trim() || undefined } }); notify('success', testTo.trim() ? `Test email sent to ${testTo}` : 'Connection works') } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const enc = [{ value: 'ssl', label: 'SSL (port 465)' }, { value: 'tls', label: 'TLS / STARTTLS (port 587)' }, { value: '', label: 'None' }]
    return (
        <div className="max-w-2xl">
            <Alert showIcon type={s.ready ? 'success' : 'warning'} className="mb-5">{s.ready ? `Emails are sent from ${s.email}.` : 'Add your mail server so invoices, estimates and reminders can be emailed.'}</Alert>
            <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>SMTP host</Label><Input disabled={!editable} value={s.host} onChange={(e) => set('host', e.target.value)} placeholder="mail.example.com" /></div>
                <div><Label>Port</Label><Input disabled={!editable} type="number" value={s.port} onChange={(e) => set('port', e.target.value)} /></div>
                <div><Label>Encryption</Label><Select isDisabled={!editable} options={enc} value={enc.find((o) => o.value === s.encryption) || enc[0]} onChange={(o) => set('encryption', o.value)} /></div>
                <div><Label>Username</Label><Input disabled={!editable} value={s.username} onChange={(e) => set('username', e.target.value)} /></div>
                <div><Label>Password</Label><Input disabled={!editable} type="password" autoComplete="new-password" placeholder={s.hasPassword ? 'Leave empty to keep the current one' : ''} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <div><Label>Sender email</Label><Input disabled={!editable} value={s.email} onChange={(e) => set('email', e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Sender name</Label><Input disabled={!editable} value={s.fromName} onChange={(e) => set('fromName', e.target.value)} /></div>
            </div>
            {editable && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Button variant="solid" loading={busy === 'save'} onClick={save}>Save settings</Button>
                    <div className="ml-auto flex items-center gap-2"><div className="w-56"><Input size="sm" placeholder="Test address (optional)" value={testTo} onChange={(e) => setTestTo(e.target.value)} /></div><Button loading={busy === 'test'} onClick={test}>{testTo.trim() ? 'Send test email' : 'Test connection'}</Button></div>
                </div>
            )}
            <p className="mt-3 text-xs text-gray-400">Save first, then test. The password is stored on the server and never shown again.</p>
        </div>
    )
}

/* ---------------- Sent log ---------------- */
const Log = () => {
    const [d, setD] = useState({ list: [], total: 0 })
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState(null)
    const [err, setErr] = useState('')
    useEffect(() => { api(`/api/crm/mail/log?pageIndex=${page}&pageSize=15${status ? `&status=${status}` : ''}`).then(setD).catch((e) => setErr(e.message)) }, [page, status])
    const opts = [{ value: 'sent', label: 'Sent' }, { value: 'failed', label: 'Failed' }]
    return (
        <div>
            <div className="mb-4 w-44"><Select size="sm" isClearable placeholder="All" options={opts} value={opts.find((o) => o.value === status) || null} onChange={(o) => { setStatus(o ? o.value : null); setPage(1) }} /></div>
            {err && <Alert showIcon type="danger" className="mb-3">{err}</Alert>}
            <div className="overflow-x-auto">
                <Table hoverable>
                    <THead><Tr><Th>Date</Th><Th>To</Th><Th>Subject</Th><Th>Template</Th><Th>Status</Th></Tr></THead>
                    <TBody>
                        {d.list.map((m) => (
                            <Tr key={m.id}>
                                <Td className="whitespace-nowrap">{new Date(m.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                                <Td className="max-w-[220px] truncate">{m.to}</Td>
                                <Td className="max-w-[320px] truncate">{m.subject}</Td>
                                <Td className="text-gray-500">{m.template}</Td>
                                <Td>{m.status === 'sent' ? <Tag className="bg-emerald-100 text-emerald-700">Sent</Tag> : <span title={m.error}><Tag className="bg-red-100 text-red-700">Failed</Tag></span>}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {!d.list.length && <div className="py-10 text-center text-gray-400">No emails yet</div>}
            </div>
            <div className="mt-4 flex justify-end"><Pagination total={d.total} pageSize={15} currentPage={page} onChange={setPage} /></div>
        </div>
    )
}

const Mails = () => {
    const [params, setParams] = useSearchParams()
    const tab = params.get('tab') || 'templates'
    return (
        <Container>
            <div className="mb-4"><h3>Mails</h3><p className="text-sm text-gray-500">Templates for quotes, invoices, payments and reminders, the mail server, and everything that was sent</p></div>
            <AdaptiveCard>
                <Tabs value={tab} onChange={(v) => setParams({ tab: v })}>
                    <TabList><TabNav value="templates">Templates</TabNav><TabNav value="settings">Mail server</TabNav><TabNav value="log">Sent log</TabNav></TabList>
                    <div className="pt-5">
                        {tab === 'templates' && <Templates />}
                        {tab === 'settings' && <Settings />}
                        {tab === 'log' && <Log />}
                    </div>
                </Tabs>
            </AdaptiveCard>
        </Container>
    )
}

export default Mails
