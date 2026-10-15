import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { TbSearch, TbWand } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Segment from '@/components/ui/Segment'
import VisualEditor from './VisualEditor'
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
import { tr } from '@/utils/t'

const { TabList, TabNav } = Tabs
const { Tr, Th, Td, THead, TBody } = Table
const Label = ({ children }) => <label className="form-label mb-2 block">{children}</label>

/* Merge fields available per template family, as in Perfex. */
const FIELDS = {
    common: ['companyname', 'crm_url', 'main_domain', 'email_signature', 'client_company', 'contact_firstname', 'contact_lastname', 'contact_email'],
    invoice: ['invoice_number', 'invoice_link', 'invoice_date', 'invoice_duedate', 'invoice_status', 'invoice_total', 'invoice_subtotal', 'invoice_amount_due', 'payment_total', 'payment_date'],
    estimate: ['estimate_number', 'estimate_link', 'estimate_date', 'estimate_expirydate', 'estimate_status', 'estimate_total', 'estimate_subtotal', 'estimate_reference_no'],
    proposals: ['proposal_number', 'proposal_subject', 'proposal_proposal_to', 'proposal_link', 'proposal_open_till', 'proposal_status', 'proposal_total'],
    purchase_order: ['purchase_order_number', 'purchase_order_date', 'purchase_order_delivery', 'purchase_order_total', 'purchase_order_reference'],
    contract: ['contract_subject', 'contract_description', 'contract_datestart', 'contract_dateend', 'contract_contract_value', 'contract_type', 'contract_link'],
}
const TYPE_LABEL = { invoice: tr("Invoices"), estimate: tr("Estimates"), proposals: tr("Proposals"), contract: tr("Contracts"), client: tr("Customers"), staff: tr("Staff"), tasks: tr("Tasks"), ticket: tr("Tickets"), project: tr("Projects"), leads: tr("Leads"), credit_note: tr("Credit notes"), subscriptions: tr("Subscriptions") }
const typeLabel = (t) => TYPE_LABEL[t] || (t || tr("Other")).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/* ---------------- Templates ---------------- */
const Templates = () => {
    const can = useCan()
    const [list, setList] = useState({ list: [], languages: [], types: [], language: '' })
    const [language, setLanguage] = useState(null)
    const [type, setType] = useState(null)
    const [search, setSearch] = useState('')
    const [sel, setSel] = useState(null)
    const [form, setForm] = useState(null)
    const [mode, setMode] = useState('visual') // visual | html | preview
    const [preview, setPreview] = useState('')
    const [saving, setSaving] = useState(false)
    const [testTo, setTestTo] = useState('')
    const [testing, setTesting] = useState(false)
    const [confirm, setConfirm] = useState(null) // 'one' | 'all'
    const [applying, setApplying] = useState(false)
    const area = useRef(null)
    const visual = useRef(null)
    const editable = can('email_templates', 'edit')
    const lang = language || list.language
    const hasDesign = ['french', 'english'].includes(lang)

    const load = useCallback(async () => {
        const q = new URLSearchParams(); if (language) q.set('language', language); if (type) q.set('type', type); if (search.trim()) q.set('query', search.trim())
        const d = await api(`/api/crm/mail/templates?${q}`); setList(d)
    }, [language, type, search])
    useEffect(() => { const t = setTimeout(() => load().catch((e) => notify('danger', e.message)), 250); return () => clearTimeout(t) }, [load])

    const open = async (row) => {
        setSel(row.id)
        const full = await api(`/api/crm/email-templates/${row.id}`)
        setForm({ id: row.id, name: full.name, type: full.type, slug: full.slug, subject: full.subject || '', message: full.message || '', fromName: full.fromName || '', active: full.active !== false, loaded: Date.now() })
    }
    useEffect(() => {
        if (!form || mode !== 'preview') return
        const t = setTimeout(() => api('/api/crm/mail/preview', { method: 'POST', body: { subject: form.subject, message: form.message } }).then((p) => setPreview(p.html)).catch(() => {}), 200)
        return () => clearTimeout(t)
    }, [mode, form?.subject, form?.message, form?.id])

    const save = async () => {
        setSaving(true)
        try {
            await api(`/api/crm/email-templates/${form.id}`, { method: 'PUT', body: { subject: form.subject, message: form.message, fromName: form.fromName, active: form.active } })
            notify('success', tr("Template saved")); load()
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const sendTest = async () => {
        setTesting(true)
        try { await api('/api/crm/mail/test-template', { method: 'POST', body: { subject: form.subject, message: form.message, to: testTo } }); notify('success', tr("Test sent to {testTo}", { testTo: testTo })) } catch (e) { notify('danger', e.message) } finally { setTesting(false) }
    }
    const applyDesign = async () => {
        setApplying(true)
        try {
            const r = await api('/api/crm/mail/apply-design', { method: 'POST', body: { language: lang, slug: confirm === 'one' ? form.slug : undefined, shell: confirm === 'all' } })
            notify('success', confirm === 'all' ? tr("{updated} templates updated", { updated: r.updated }) : tr("Design applied"))
            setConfirm(null); await load()
            if (form) { const row = { id: form.id }; await open(row) }
        } catch (e) { notify('danger', e.message) } finally { setApplying(false) }
    }
    const insert = (f) => {
        const tag = `{${f}}`
        if (mode === 'visual') return visual.current?.insert(tag)
        const el = area.current
        if (!el) return
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
                <Input size="sm" prefix={<TbSearch className="text-lg" />} placeholder={tr("Search templates")} value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                    <Select size="sm" isClearable placeholder={tr("All types")} options={typeOpts} value={typeOpts.find((o) => o.value === type) || null} onChange={(o) => setType(o ? o.value : null)} />
                    <Select size="sm" options={langOpts} value={langOpts.find((o) => o.value === lang) || null} onChange={(o) => o && setLanguage(o.value)} />
                </div>
                {editable && hasDesign && <Button size="sm" icon={<TbWand />} onClick={() => setConfirm('all')}>{tr("Apply ready-made designs to all")}</Button>}
                <div className="max-h-[640px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-600">
                    {Object.entries(grouped).map(([t, rows]) => (
                        <div key={t}>
                            <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700">{typeLabel(t)}</div>
                            {rows.map((r) => (
                                <button key={r.id} type="button" onClick={() => open(r)} className={cn('block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50', sel === r.id && 'bg-primary/10')}>
                                    <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{r.name}</span>{!r.active && <Tag className="bg-gray-200 text-gray-600">{tr("Off")}</Tag>}</div>
                                    <div className="truncate text-xs text-gray-500">{r.subject}</div>
                                </button>
                            ))}
                        </div>
                    ))}
                    {!list.list.length && <div className="p-6 text-center text-sm text-gray-400">{tr("No templates")}</div>}
                </div>
            </div>

            <div className="min-w-0">
                {!form ? <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400 dark:border-gray-600">{tr("Choose a template to edit")}</div> : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="min-w-0 flex-1"><h5 className="truncate">{form.name}</h5><p className="text-xs text-gray-500">{typeLabel(form.type)} · {form.slug}</p></div>
                            <div className="flex items-center gap-2 text-sm">{tr("Active")}<Switcher checked={form.active} disabled={!editable} onChange={(v) => setForm({ ...form, active: v })} /></div>
                            {editable && hasDesign && <Button size="sm" icon={<TbWand />} onClick={() => setConfirm('one')}>{tr("Ready-made design")}</Button>}
                            {editable && <Button variant="solid" loading={saving} onClick={save}>{tr("Save")}</Button>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><Label>{tr("Subject")}</Label><Input disabled={!editable} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                            <div><Label>{tr("From name")}</Label><Input disabled={!editable} value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} /></div>
                        </div>
                        <div>
                            <Label>{tr("Merge fields")} <span className="font-normal text-gray-400">{tr("(click to insert at the cursor)")}</span></Label>
                            <div className="flex flex-wrap gap-1.5">
                                {fields.map((f) => <button key={f} type="button" disabled={!editable || mode === 'preview'} onClick={() => insert(f)} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary disabled:opacity-50 dark:bg-gray-700">{`{${f}}`}</button>)}
                            </div>
                        </div>
                        <div>
                            <div className="mb-3"><Segment size="sm" value={mode} onChange={(v) => v && setMode(v)}><Segment.Item value="visual">{tr("Visual")}</Segment.Item><Segment.Item value="html">{tr("HTML")}</Segment.Item><Segment.Item value="preview">{tr("Preview")}</Segment.Item></Segment></div>
                            {mode === 'visual' && <VisualEditor ref={visual} docKey={`${form.id}-${form.loaded}`} value={form.message} disabled={!editable} onChange={(html) => setForm((f) => ({ ...f, message: html }))} />}
                            {mode === 'html' && <textarea ref={area} disabled={!editable} spellCheck={false} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="h-[580px] w-full rounded-xl border border-gray-300 bg-white p-3 font-mono text-xs dark:border-gray-600 dark:bg-gray-800" />}
                            {mode === 'preview' && <iframe title={tr("Template preview")} sandbox="" srcDoc={preview} className="h-[580px] w-full rounded-xl border border-gray-200 bg-white dark:border-gray-600" />}
                            {mode === 'preview' && <p className="mt-1 text-xs text-gray-400">{tr("Sample data is used. Fields highlighted in yellow have no sample value.")}</p>}
                        </div>
                        {editable && (
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-64"><Input size="sm" placeholder={tr("Send a test to…")} value={testTo} onChange={(e) => setTestTo(e.target.value)} /></div>
                                <Button size="sm" loading={testing} disabled={!testTo.trim()} onClick={sendTest}>{tr("Send test")}</Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmDialog isOpen={!!confirm} type="warning" title={confirm === 'all' ? tr("Apply ready-made designs to all {lang} templates?", { lang: lang }) : tr("Apply the ready-made design?")} confirmText={tr("Apply design")} confirmButtonProps={{ loading: applying }} onClose={() => setConfirm(null)} onRequestClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={applyDesign}>
                <p>{confirm === 'all' ? tr("Every template in this language gets a new subject and a modern HTML layout, and the shared email header and footer are replaced.") : tr("The subject and content of this template are replaced by the ready-made design.")} {tr("Your current versions are saved in a backup file on the server first.")}</p>
            </ConfirmDialog>
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
    if (!s) return <div className="py-10 text-center text-gray-400">{tr("Loading…")}</div>
    const set = (k, v) => setS({ ...s, [k]: v })
    const save = async () => {
        setBusy('save')
        try { await api('/api/crm/mail/settings', { method: 'PUT', body: { ...s, password } }); setPassword(''); setS(await api('/api/crm/mail/settings')); notify('success', tr("Mail settings saved")) } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const test = async () => {
        setBusy('test')
        try { await api('/api/crm/mail/test', { method: 'POST', body: { to: testTo.trim() || undefined } }); notify('success', testTo.trim() ? tr("Test email sent to {testTo}", { testTo: testTo }) : tr("Connection works")) } catch (e) { notify('danger', e.message) } finally { setBusy('') }
    }
    const enc = [{ value: 'ssl', label: tr("SSL (port 465)") }, { value: 'tls', label: tr("TLS / STARTTLS (port 587)") }, { value: '', label: tr("None") }]
    return (
        <div className="max-w-2xl">
            <Alert showIcon type={s.ready ? 'success' : 'warning'} className="mb-5">{s.ready ? tr("Emails are sent from {email}.", { email: s.email }) : tr("Add your mail server so invoices, estimates and reminders can be emailed.")}</Alert>
            <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>{tr("SMTP host")}</Label><Input disabled={!editable} value={s.host} onChange={(e) => set('host', e.target.value)} placeholder={tr("mail.example.com")} /></div>
                <div><Label>{tr("Port")}</Label><Input disabled={!editable} type="number" value={s.port} onChange={(e) => set('port', e.target.value)} /></div>
                <div><Label>{tr("Encryption")}</Label><Select isDisabled={!editable} options={enc} value={enc.find((o) => o.value === s.encryption) || enc[0]} onChange={(o) => set('encryption', o.value)} /></div>
                <div><Label>{tr("Username")}</Label><Input disabled={!editable} value={s.username} onChange={(e) => set('username', e.target.value)} /></div>
                <div><Label>{tr("Password")}</Label><Input disabled={!editable} type="password" autoComplete="new-password" placeholder={s.hasPassword ? tr("Leave empty to keep the current one") : ''} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <div><Label>{tr("Sender email")}</Label><Input disabled={!editable} value={s.email} onChange={(e) => set('email', e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>{tr("Sender name")}</Label><Input disabled={!editable} value={s.fromName} onChange={(e) => set('fromName', e.target.value)} /></div>
            </div>
            {editable && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Button variant="solid" loading={busy === 'save'} onClick={save}>{tr("Save settings")}</Button>
                    <div className="ml-auto flex items-center gap-2"><div className="w-56"><Input size="sm" placeholder={tr("Test address (optional)")} value={testTo} onChange={(e) => setTestTo(e.target.value)} /></div><Button loading={busy === 'test'} onClick={test}>{testTo.trim() ? tr("Send test email") : tr("Test connection")}</Button></div>
                </div>
            )}
            <p className="mt-3 text-xs text-gray-400">{tr("Save first, then test. The password is stored on the server and never shown again.")}</p>
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
    const opts = [{ value: 'sent', label: tr("Sent") }, { value: 'failed', label: tr("Failed") }]
    return (
        <div>
            <div className="mb-4 w-44"><Select size="sm" isClearable placeholder={tr("All")} options={opts} value={opts.find((o) => o.value === status) || null} onChange={(o) => { setStatus(o ? o.value : null); setPage(1) }} /></div>
            {err && <Alert showIcon type="danger" className="mb-3">{err}</Alert>}
            <div className="overflow-x-auto">
                <Table hoverable>
                    <THead><Tr><Th>{tr("Date")}</Th><Th>{tr("To")}</Th><Th>{tr("Subject")}</Th><Th>{tr("Template")}</Th><Th>{tr("Status")}</Th></Tr></THead>
                    <TBody>
                        {d.list.map((m) => (
                            <Tr key={m.id}>
                                <Td className="whitespace-nowrap">{new Date(m.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</Td>
                                <Td className="max-w-[220px] truncate">{m.to}</Td>
                                <Td className="max-w-[320px] truncate">{m.subject}</Td>
                                <Td className="text-gray-500">{m.template}</Td>
                                <Td>{m.status === 'sent' ? <Tag className="bg-emerald-100 text-emerald-700">{tr("Sent")}</Tag> : <span title={m.error}><Tag className="bg-red-100 text-red-700">{tr("Failed")}</Tag></span>}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
                {!d.list.length && <div className="py-10 text-center text-gray-400">{tr("No emails yet")}</div>}
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
            <div className="mb-4"><h3>{tr("Mails")}</h3><p className="text-sm text-gray-500">{tr("Templates for quotes, invoices, payments and reminders, the mail server, and everything that was sent")}</p></div>
            <AdaptiveCard>
                <Tabs value={tab} onChange={(v) => setParams({ tab: v })}>
                    <TabList><TabNav value="templates">{tr("Templates")}</TabNav><TabNav value="settings">{tr("Mail server")}</TabNav><TabNav value="log">{tr("Sent log")}</TabNav></TabList>
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

export { Settings as MailServerSettings }
export default Mails
