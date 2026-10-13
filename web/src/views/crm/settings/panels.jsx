import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { TbCopy, TbEye, TbExternalLink, TbPencil, TbPlayerPlay, TbPlus, TbRefresh } from 'react-icons/tb'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Tag from '@/components/ui/Tag'
import { getResource } from '@/lib/crm/resources'
import { SHELL } from '@/lib/crm/mailDesign/build'
import ResourceTable from '../kit/ResourceTable'
import RecordDrawer from '../kit/RecordDrawer'
import { api, notify, useCan } from '../kit/api'
import { MailServerSettings } from '../mail/Mails'
import { TokenChip } from './fields'
import { CLIENT_TOKENS, COMPANY_TOKENS, SAMPLE_CLIENT, companyData, renderFormat } from './tokens'

/** Any registry resource as a small manager: table + create/edit drawer. */
export const ResourceManager = ({ resourceKey, where, initial, hide, note }) => {
    const resource = getResource(resourceKey)
    const can = useCan()
    const [drawer, setDrawer] = useState({ open: false, id: null })
    const [reload, setReload] = useState(0)
    if (!resource) return <p className="text-sm text-gray-500">This list is not available.</p>
    const canCreate = !resource.readOnly && can(resource.feature, 'create')
    const canEdit = !resource.readOnly && can(resource.feature, 'edit')
    const canDelete = !resource.readOnly && can(resource.feature, 'delete')
    const done = () => setReload((n) => n + 1)
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-500">{note}</p>
                {canCreate && <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => setDrawer({ open: true, id: null })}>New {resource.label.toLowerCase()}</Button>}
            </div>
            <ResourceTable resource={resource} where={where} reloadKey={reload} onRowClick={(r) => setDrawer({ open: true, id: r.id })} rowActions={(r) => <Button size="sm" variant="plain" icon={<TbPencil />} onClick={() => setDrawer({ open: true, id: r.id })} />} />
            <RecordDrawer resource={resource} open={drawer.open} id={drawer.id} initial={initial} hide={hide} canEdit={drawer.id ? canEdit : canCreate} canDelete={canDelete} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onSaved={done} onDeleted={done} />
        </div>
    )
}

/** Merge terms under a format textarea: click to insert, live preview below. */
export const FormatPanel = ({ kind, fieldKey, values, setValue, customFields = [] }) => {
    const isCompany = kind === 'company'
    const tokens = isCompany ? COMPANY_TOKENS : [...CLIENT_TOKENS, ...customFields.map((c) => `cf_${c.legacyId}`)]
    const data = useMemo(() => {
        if (isCompany) return companyData(values)
        const d = { ...SAMPLE_CLIENT }
        customFields.forEach((c) => { d[`cf_${c.legacyId}`] = c.name })
        return d
    }, [isCompany, values, customFields])
    const insert = (token) => {
        const el = document.getElementById(`f-${fieldKey}`)
        const cur = values[fieldKey] || ''
        const s = el?.selectionStart ?? cur.length, e = el?.selectionEnd ?? s
        setValue(fieldKey, `${cur.slice(0, s)}{${token}}${cur.slice(e)}`)
        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(s + token.length + 2, s + token.length + 2) })
    }
    const html = renderFormat(values[fieldKey], data)
    return (
        <div className="md:col-span-2">
            <div className="mb-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">Merge terms <span className="font-normal text-gray-400">(click to insert in the text below)</span></div>
            <div className="mb-3 flex flex-wrap gap-1.5">{tokens.map((t) => <TokenChip key={t} token={t} onClick={insert} />)}</div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Preview {isCompany ? '(with your details)' : '(with a sample client)'}</div>
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm leading-relaxed dark:border-gray-600" dangerouslySetInnerHTML={{ __html: html || '<span style="color:#9ca3af">Nothing to show yet</span>' }} />
            <p className="mt-2 text-xs text-gray-400">These terms also work in email templates and anywhere the company details are printed. Use {'<br />'} or a new line for line breaks.</p>
        </div>
    )
}

/** Email header/footer: restore the trtCRM design and preview it. */
export const EmailDesignPanel = ({ values, setValue }) => {
    const preview = `${values.email_header || ''}<h2 style="font-family:Arial,sans-serif;margin:0 0 12px">Your invoice is ready</h2><p style="font-family:Arial,sans-serif;line-height:1.6">Hello, this is how your emails look with this header and footer.</p>${values.email_signature || ''}${values.email_footer || ''}`
    return (
        <div className="md:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button size="sm" icon={<TbRefresh />} onClick={() => { setValue('email_header', SHELL.header); setValue('email_footer', SHELL.footer); notify('success', 'trtCRM design restored. Save to apply it.') }}>Restore the trtCRM design</Button>
                <span className="text-xs text-gray-400">Merge terms such as {'{companyname}'} work in the header, footer and signature.</span>
            </div>
            <iframe title="Email preview" sandbox="" srcDoc={preview.replace(/\{companyname\}/g, 'Your company').replace(/\{[a-z_]+\}/g, '')} className="h-72 w-full rounded-xl border border-gray-200 bg-white dark:border-gray-600" />
        </div>
    )
}

/** Client custom fields with their merge terms. */
export const CustomFieldsPanel = () => {
    const can = useCan()
    const resource = getResource('custom-fields')
    const [drawer, setDrawer] = useState({ open: false, id: null })
    const [rows, setRows] = useState(null)
    const load = useCallback(() => api('/api/crm/custom-fields?where.fieldTo=customers&pageSize=100&sortKey=fieldOrder').then((d) => setRows(d.list)).catch((e) => notify('danger', e.message)), [])
    useEffect(() => { load() }, [load])
    const copy = async (t) => { try { await navigator.clipboard.writeText(t); notify('success', `${t} copied`) } catch { notify('danger', 'Could not copy') } }
    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm text-gray-500">Click a merge term to copy it, then paste it into a document format or an email template.</p>
                {can('settings', 'edit') && <Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => setDrawer({ open: true, id: null })}>New custom field</Button>}
            </div>
            {!rows ? <div className="flex h-24 items-center justify-center"><Spinner size={24} /></div> : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                    {rows.map((r) => (
                        <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                            <button type="button" onClick={() => setDrawer({ open: true, id: r.id })} className="min-w-[160px] flex-1 text-left font-semibold hover:underline">{r.name}</button>
                            <span className="text-xs text-gray-500">{r.type}</span>
                            {r.required && <Tag className="bg-red-100 text-red-700">Required</Tag>}
                            {!r.active && <Tag>Inactive</Tag>}
                            <button type="button" onClick={() => copy(`{cf_${r.legacyId}}`)} className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs hover:bg-primary/10 hover:text-primary dark:bg-gray-700">{`{cf_${r.legacyId}}`}</button>
                        </div>
                    ))}
                    {!rows.length && <p className="p-6 text-center text-gray-400">No custom fields yet.</p>}
                </div>
            )}
            <RecordDrawer resource={resource} open={drawer.open} id={drawer.id} initial={{ fieldTo: 'customers' }} hide={['fieldTo']} canEdit={can('settings', 'edit')} canDelete={can('settings', 'edit')} onClose={() => setDrawer((d) => ({ ...d, open: false }))} onSaved={load} onDeleted={load} />
        </div>
    )
}

export const ClientPermissionsPanel = () => (
    <div className="text-sm text-gray-600 dark:text-gray-300">
        <p className="mb-3">Who can see and change clients is set per role, so each team member gets exactly what they need.</p>
        <ul className="mb-4 list-disc space-y-1 pl-5">
            <li><b>View</b> sees every client, <b>View own</b> only the clients the person is an admin of.</li>
            <li><b>Create, Edit, Delete</b> are separate rights. A client with invoices, contracts or tickets cannot be deleted.</li>
            <li>Client admins are chosen on each client.</li>
        </ul>
        <div className="flex flex-wrap gap-2"><Button size="sm" icon={<TbExternalLink />} onClick={() => window.open('/crm/roles', '_self')}>Roles & permissions</Button><Button size="sm" onClick={() => window.open('/team', '_self')}>Team members</Button></div>
    </div>
)

/** The cron command, a manual run and the recent runs. */
export const CronPanel = ({ log }) => {
    const [info, setInfo] = useState(null)
    const [runs, setRuns] = useState(null)
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState(null)
    const [confirmRun, setConfirmRun] = useState(false)
    const load = useCallback(async () => {
        try { setInfo(await api('/api/crm/cron/info')); if (log) setRuns((await api('/api/crm/cron/log')).list) } catch (e) { notify('danger', e.message) }
    }, [log])
    useEffect(() => { load() }, [load])
    const run = async (dry) => {
        setBusy(true); setResult(null); setConfirmRun(false)
        try { const r = await api('/api/crm/cron/run', { method: 'POST', body: { force: true, dry } }); setResult({ ...r, dry }); notify('success', dry ? 'Preview ready (nothing was sent or changed)' : 'Cron run finished'); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const copy = async (t) => { try { await navigator.clipboard.writeText(t); notify('success', 'Copied') } catch { notify('danger', 'Could not copy') } }
    if (!info) return <div className="flex h-24 items-center justify-center"><Spinner size={24} /></div>
    if (log) {
        return !runs ? <div className="flex h-16 items-center justify-center"><Spinner size={22} /></div> : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm dark:divide-gray-700 dark:border-gray-700">
                {runs.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <span className="w-44 text-gray-500">{new Date(r.startedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <Tag className={r.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{r.ok ? 'OK' : 'Errors'}</Tag>
                        <span className="text-gray-500">{r.trigger}</span>
                        <span className="min-w-0 flex-1 truncate">{r.summary}</span>
                        <span className="text-xs text-gray-400">{r.ms} ms</span>
                    </div>
                ))}
                {!runs.length && <p className="p-6 text-center text-gray-400">No runs yet.</p>}
            </div>
        )
    }
    return (
        <div>
            {!info.enabled && <Alert showIcon type="warning" className="mb-4">The automatic tasks are <b>turned off</b>, so the scheduled command does nothing yet. Turn them on in “Automatic tasks” above once you are ready.</Alert>}
            <Alert showIcon type={info.lastRun && Date.now() - new Date(info.lastRun).getTime() < 26 * 3600 * 1000 ? 'success' : 'warning'} className="mb-4">
                {info.lastRun ? `Last run ${new Date(info.lastRun).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.` : 'The cron job has not run yet.'} Set it to run every 5 to 15 minutes; each task then does its work at the hour you choose below.
            </Alert>
            <div className="mb-1.5 text-sm font-semibold">Cron command</div>
            <div className="mb-2 flex gap-2"><Input readOnly value={info.command} onFocus={(e) => e.target.select()} /><Button icon={<TbCopy />} onClick={() => copy(info.command)}>Copy</Button></div>
            <p className="mb-4 text-xs text-gray-400">Add it to your server&apos;s crontab, or to any scheduler that can call a web address (for example <code>*/10 * * * *</code>).</p>
            <div className="mb-1.5 text-sm font-semibold">crontab line</div>
            <div className="mb-4 flex gap-2"><Input readOnly value={`*/10 * * * * ${info.command}`} onFocus={(e) => e.target.select()} /><Button icon={<TbCopy />} onClick={() => copy(`*/10 * * * * ${info.command}`)}>Copy</Button></div>
            <div className="flex flex-wrap items-center gap-3">
                <Button icon={busy ? <Spinner size={16} /> : <TbEye />} disabled={busy} onClick={() => run(true)}>Preview what would happen</Button>
                <Button variant="solid" icon={<TbPlayerPlay />} disabled={busy} onClick={() => setConfirmRun(true)}>Run cron manually</Button>
                <span className="text-xs text-gray-400">Both ignore the hour settings. The preview sends and changes nothing.</span>
            </div>
            {result && <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-gray-50 p-4 text-xs dark:bg-gray-700/40">{result.dry ? 'PREVIEW (nothing was sent or changed)\n\n' : ''}{result.lines.join('\n')}</pre>}
            <ConfirmDialog isOpen={confirmRun} type="warning" title="Run all automatic tasks now?" confirmText="Run now" onClose={() => setConfirmRun(false)} onRequestClose={() => setConfirmRun(false)} onCancel={() => setConfirmRun(false)} onConfirm={() => run(false)}>
                <p>Reminders are emailed to your real clients and recurring invoices are created, exactly as the scheduled run would do. Use “Preview” first to see the list.</p>
            </ConfirmDialog>
        </div>
    )
}
