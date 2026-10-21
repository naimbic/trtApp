/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbMailForward, TbPlus, TbPencil, TbTrash, TbPlayerPlay, TbEye, TbHistory, TbPlugConnected, TbUsersPlus, TbAlertTriangle, TbCircleCheck } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

const post = (body) => api('/api/crm/lead-mail', { method: 'POST', body })
const Label = ({ children, hint }) => <div className="mb-1.5 flex items-baseline justify-between gap-2"><label className="form-label block">{children}</label>{hint && <span className="text-xs text-gray-400">{hint}</span>}</div>
const Sw = ({ checked, onChange, children }) => <label className="flex items-center gap-2 text-sm font-semibold"><Switcher checked={checked} onChange={onChange} />{children}</label>
const Group = ({ title, desc, children }) => <section className="mb-5"><h6 className="mb-0.5">{title}</h6>{desc && <p className="mb-3 text-xs text-gray-400">{desc}</p>}<div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div></section>
const pick = (list, v) => list.find((o) => o.value === v) || null

const blank = () => ({ active: true, email: '', imapServer: '', imapPort: '', imapUser: '', encryption: 'ssl', folder: 'INBOX', checkEvery: 5, password: '', hasPassword: false, leadSourceId: null, leadStatusId: null, responsible: null, markPublic: false, startFrom: dayjs().format('YYYY-MM-DD'), fromFilter: '', subjectFilter: '', bodyFilter: '', requireForm: true, fieldMap: '', createTaskIfCustomer: true, followUpTask: true, followUpHours: 24, markSeen: true, deleteAfterImport: false, onlyUnseen: false })

const MailDialog = ({ open, box, lookups, onClose, onSaved }) => {
    const [v, setV] = useState(blank())
    const [busy, setBusy] = useState(false)
    const [testing, setTesting] = useState(false)
    const [msg, setMsg] = useState(null)
    useEffect(() => { if (open) { setV(box ? { ...blank(), ...box, password: '', startFrom: box.startFrom ? dayjs(box.startFrom).format('YYYY-MM-DD') : '' } : blank()); setMsg(null) } }, [open, box])
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const enc = [{ value: 'ssl', label: 'SSL / TLS (993)' }, { value: 'tls', label: 'STARTTLS (143)' }, { value: 'no', label: tr('None') }]
    const test = async () => {
        setTesting(true); setMsg(null)
        try { setMsg({ ok: true, text: (await post({ action: 'test', id: box?.id, data: v })).message }) } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setTesting(false) }
    }
    const save = async () => {
        setBusy(true)
        try { await post({ action: 'save', id: box?.id, data: v }); notify('success', tr('Mailbox saved')); onSaved(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={860} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4 pr-10">{box ? tr('Edit mailbox') : tr('New mailbox')}</h5>
            <div className="max-h-[68vh] overflow-y-auto pr-1">
                <Group title={tr('Connection')} desc={tr('The mailbox your website forms send to. The CRM reads it over IMAP (SMTP is only for sending).')}>
                    <div><Label>{tr('Email address')}</Label><Input autoFocus value={v.email} onChange={(e) => set({ email: e.target.value })} placeholder="hello@yourcompany.com" /></div>
                    <div><Label hint={v.hasPassword ? tr('Leave empty to keep it') : ''}>{tr('Password')}</Label><Input type="password" autoComplete="new-password" value={v.password} onChange={(e) => set({ password: e.target.value })} placeholder={v.hasPassword ? '••••••••' : ''} /></div>
                    <div><Label>{tr('IMAP server')}</Label><Input value={v.imapServer} onChange={(e) => set({ imapServer: e.target.value })} placeholder="mail.yourcompany.com" /></div>
                    <div className="grid grid-cols-2 gap-3"><div><Label>{tr('Encryption')}</Label><Select size="sm" isSearchable={false} options={enc} value={pick(enc, v.encryption)} onChange={(o) => set({ encryption: o.value })} /></div><div><Label hint={tr('optional')}>{tr('Port')}</Label><Input type="number" value={v.imapPort || ''} onChange={(e) => set({ imapPort: e.target.value })} /></div></div>
                    <div><Label hint={tr('if not the email address')}>{tr('Login name')}</Label><Input value={v.imapUser} onChange={(e) => set({ imapUser: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3"><div><Label>{tr('Folder')}</Label><Input value={v.folder} onChange={(e) => set({ folder: e.target.value })} /></div><div><Label>{tr('Check every (minutes)')}</Label><Input type="number" min={1} value={v.checkEvery} onChange={(e) => set({ checkEvery: e.target.value })} /></div></div>
                    <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                        <Button size="sm" icon={<TbPlugConnected />} loading={testing} onClick={test}>{tr('Test connection')}</Button>
                        {msg && <span className={`text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</span>}
                    </div>
                </Group>
                <Group title={tr('Which emails are leads')} desc={tr('Only emails that match every filter you fill in become leads. Everything else stays untouched in the mailbox. Separate several words with commas.')}>
                    <div><Label hint={tr('the website\'s sender address')}>{tr('Sender contains')}</Label><Input value={v.fromFilter} onChange={(e) => set({ fromFilter: e.target.value })} placeholder="wordpress@, noreply@yoursite.com" /></div>
                    <div><Label>{tr('Subject contains')}</Label><Input value={v.subjectFilter} onChange={(e) => set({ subjectFilter: e.target.value })} placeholder={tr('contact, quote, new message')} /></div>
                    <div><Label>{tr('Text contains')}</Label><Input value={v.bodyFilter} onChange={(e) => set({ bodyFilter: e.target.value })} /></div>
                    <div className="flex items-end"><Sw checked={v.requireForm} onChange={(c) => set({ requireForm: c })}>{tr('Must look like a form (an email address and "Label: value" lines)')}</Sw></div>
                    <div className="md:col-span-2"><Label hint={tr('optional, one per line')}>{tr('Names used in your forms')}</Label><Input textArea rows={3} value={v.fieldMap} onChange={(e) => set({ fieldMap: e.target.value })} placeholder={'Name = Your name, Full name\nPhone = Mobile, WhatsApp\nCompany = Business'} /><p className="mt-1 text-xs text-gray-400">{tr('Name, email, phone, company, website, city and message are recognised in English, French, Spanish and Arabic. Add your own labels only if a field is missed. Anything not recognised is kept in the lead\'s description.')}</p></div>
                </Group>
                <Group title={tr('What the lead gets')}>
                    <div><Label>{tr('Lead source')}</Label><Select size="sm" isClearable placeholder={tr('Default source')} options={lookups.sources} value={pick(lookups.sources, v.leadSourceId)} onChange={(o) => set({ leadSourceId: o?.value || null })} /></div>
                    <div><Label>{tr('Lead status')}</Label><Select size="sm" isClearable placeholder={tr('Default status')} options={lookups.statuses} value={pick(lookups.statuses, v.leadStatusId)} onChange={(o) => set({ leadStatusId: o?.value || null })} /></div>
                    <div><Label>{tr('Responsible')}</Label><Select size="sm" isClearable placeholder={tr('Nobody')} options={lookups.staff} value={pick(lookups.staff, v.responsible)} onChange={(o) => set({ responsible: o?.value || null })} /></div>
                    <div><Label hint={tr('emails older than this are ignored')}>{tr('Read emails received since')}</Label><Input type="date" value={v.startFrom} onChange={(e) => set({ startFrom: e.target.value })} /></div>
                    <Sw checked={v.followUpTask} onChange={(c) => set({ followUpTask: c })}>{tr('Create a follow-up task for the responsible person')}</Sw>
                    <div><Label hint={tr('hours to answer')}>{tr('Task due after')}</Label><Input type="number" min={0} disabled={!v.followUpTask} value={v.followUpHours} onChange={(e) => set({ followUpHours: e.target.value })} /></div>
                    <Sw checked={v.createTaskIfCustomer} onChange={(c) => set({ createTaskIfCustomer: c })}>{tr('When the sender is already a customer, create a task instead of a lead')}</Sw>
                    <Sw checked={v.markPublic} onChange={(c) => set({ markPublic: c })}>{tr('Make the leads public (everyone sees them)')}</Sw>
                </Group>
                <Group title={tr('After importing')}>
                    <Sw checked={v.markSeen} onChange={(c) => set({ markSeen: c })}>{tr('Mark the email as read')}</Sw>
                    <Sw checked={v.deleteAfterImport} onChange={(c) => set({ deleteAfterImport: c })}>{tr('Delete the email from the mailbox')}</Sw>
                    <Sw checked={v.onlyUnseen} onChange={(c) => set({ onlyUnseen: c })}>{tr('Only look at unread emails')}</Sw>
                    <Sw checked={v.active} onChange={(c) => set({ active: c })}>{tr('Active (checked automatically)')}</Sw>
                </Group>
            </div>
            <div className="mt-4 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button><Button variant="solid" loading={busy} onClick={save}>{tr('Save')}</Button></div>
        </Dialog>
    )
}

const RESULT = { imported: ['bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', 'New lead'], duplicate: ['bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300', 'Already known'], skipped: ['bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', 'Not a lead'] }

/** What the reader decided for the last emails (preview, nothing is saved) or what it did (the activity log). */
const ListDialog = ({ mode, box, onClose }) => {
    const [rows, setRows] = useState(null)
    const [err, setErr] = useState('')
    useEffect(() => {
        if (!mode || !box) return
        setRows(null); setErr('')
        const p = mode === 'preview' ? post({ action: 'preview', id: box.id }) : api(`/api/crm/lead-mail?log=${box.id}`)
        p.then((d) => setRows(d.list)).catch((e) => setErr(e.message))
    }, [mode, box])
    return (
        <Dialog isOpen={!!mode} width={900} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1 pr-10">{mode === 'preview' ? tr('Preview: the last emails') : tr('Activity')}</h5>
            <p className="mb-4 text-sm text-gray-500">{mode === 'preview' ? tr('This is what the reader would decide for the latest emails in the mailbox. Nothing is saved or changed.') : tr('Every email the reader looked at, and what it did.')}</p>
            {err && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{err}</div>}
            {!rows && !err && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            {rows && !rows.length && <div className="py-10 text-center text-gray-400">{tr('Nothing here')}</div>}
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {rows?.map((r, i) => {
                    const res = mode === 'preview' ? (r.lead ? 'imported' : 'skipped') : r.result
                    const [cls, label] = RESULT[res] || RESULT.skipped
                    return (
                        <div key={r.id || r.uid || i} className="rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
                            <div className="flex items-start gap-3">
                                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${cls}`}>{tr(label)}</span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-bold">{r.subject || tr('(no subject)')}</div>
                                    <div className="truncate text-xs text-gray-400">{r.from} · {dayjs(r.date).format('DD MMM YYYY HH:mm')}</div>
                                </div>
                                {r.leadId && <a className="shrink-0 text-xs font-semibold text-primary" href={`/crm/leads/${r.leadId}`}>{tr('Open lead')}</a>}
                            </div>
                            {r.reason && <div className="mt-1 text-xs text-gray-500">{tr(r.reason)}</div>}
                            {r.found && (
                                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-700/40 md:grid-cols-3">
                                    {[['Name', r.found.name], ['Email', r.found.email], ['Phone', r.found.phone], ['Company', r.found.company], ['Website', r.found.website], ['City', r.found.city]].filter(([, x]) => x).map(([l, x]) => <div key={l} className="truncate"><span className="text-gray-400">{tr(l)}: </span>{x}</div>)}
                                    {r.found.description && <div className="col-span-full line-clamp-3 whitespace-pre-line"><span className="text-gray-400">{tr('Message')}: </span>{r.found.description}</div>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Dialog>
    )
}

const MailCard = ({ b, onEdit, onList, onRun, onDelete, onToggle, running }) => {
    const bad = !!b.lastError
    return (
        <section className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xl text-primary"><TbMailForward /></span>
                <div className="min-w-0 flex-1"><h4 className="truncate text-[15px] font-extrabold">{b.email}</h4><div className="truncate text-xs text-gray-400">{b.imapServer || tr('No server yet')} · {b.folder} · {tr('every {n} min', { n: b.checkEvery })}</div></div>
                <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-gray-500">{b.active ? tr('Active') : tr('Off')}<Switcher checked={b.active} onChange={onToggle} /></label>
            </div>
            <div className="mt-3 text-sm">
                {bad ? <div className="flex items-start gap-1.5 text-red-500"><TbAlertTriangle className="mt-0.5 shrink-0 text-base" /><span>{b.lastError}</span></div>
                    : b.lastRunAt ? <div className="flex items-start gap-1.5 text-gray-500"><TbCircleCheck className="mt-0.5 shrink-0 text-base text-emerald-500" /><span>{b.lastResult}</span></div>
                        : <div className="text-gray-400">{tr('Not checked yet')}</div>}
                {b.lastRunAt && <div className="mt-0.5 text-xs text-gray-400">{tr('Last check {d}', { d: dayjs(b.lastRunAt).format('DD MMM HH:mm') })}</div>}
            </div>
            <div className="mt-3 flex items-end justify-between"><div><div className="text-3xl font-extrabold tabular-nums">{b.importedCount}</div><div className="text-xs text-gray-400">{tr('leads imported')}</div></div></div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                <Button size="xs" variant="solid" icon={<TbPlayerPlay />} loading={running} onClick={onRun}>{tr('Check now')}</Button>
                <Button size="xs" icon={<TbEye />} onClick={() => onList('preview')}>{tr('Preview')}</Button>
                <Button size="xs" icon={<TbHistory />} onClick={() => onList('log')}>{tr('Activity')}</Button>
                <Button size="xs" icon={<TbPencil />} onClick={onEdit}>{tr('Edit')}</Button>
                <Button size="xs" className="text-red-500" icon={<TbTrash />} onClick={onDelete} />
            </div>
        </section>
    )
}

/** Lead email integration: mailboxes whose contact-form emails become leads. */
const LeadMailPage = () => {
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [dlg, setDlg] = useState({ open: false, box: null })
    const [list, setList] = useState({ mode: null, box: null })
    const [del, setDel] = useState(null)
    const [running, setRunning] = useState(null)
    const load = useCallback(() => { api('/api/crm/lead-mail').then((x) => { setD(x); setError('') }).catch((e) => setError(e.message)) }, [])
    useEffect(() => { load() }, [load])
    const boxes = d?.list || []
    const run = async (b) => {
        setRunning(b.id)
        try { const r = await post({ action: 'run', id: b.id }); notify(r.ok ? 'success' : 'danger', r.message) } catch (e) { notify('danger', e.message) } finally { setRunning(null); load() }
    }
    const toggle = async (b, c) => { try { await post({ action: 'save', id: b.id, data: { ...b, password: '', active: c } }); load() } catch (e) { notify('danger', e.message) } }
    return (
        <Container>
            <InvoiceHead
                title={tr('Lead email integration')}
                stats={[
                    { icon: <TbMailForward />, label: tr('Mailboxes'), value: d ? String(boxes.length) : '–' },
                    { icon: <TbCircleCheck />, label: tr('Active'), value: d ? String(boxes.filter((b) => b.active).length) : '–' },
                    { icon: <TbUsersPlus />, label: tr('Leads imported'), value: d ? String(boxes.reduce((n, b) => n + b.importedCount, 0)) : '–' },
                    { icon: <TbAlertTriangle />, label: tr('With errors'), value: d ? String(boxes.filter((b) => b.lastError).length) : '–' },
                ]}
            />
            <div className="cx-tools"><Button size="sm" variant="solid" className="ml-auto" icon={<TbPlus />} onClick={() => setDlg({ open: true, box: null })}>{tr('New mailbox')}</Button></div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {boxes.map((b) => <MailCard key={b.id} b={b} running={running === b.id} onEdit={() => setDlg({ open: true, box: b })} onList={(mode) => setList({ mode, box: b })} onRun={() => run(b)} onDelete={() => setDel(b)} onToggle={(c) => toggle(b, c)} />)}
            </div>
            {d && !boxes.length && (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 dark:border-gray-600">
                    <div className="mb-2 font-bold">{tr('Turn the emails from your website forms into leads')}</div>
                    <ol className="list-decimal pl-6 text-sm text-gray-500">
                        <li>{tr('Add the mailbox your forms send to (IMAP server, email, password) and test the connection.')}</li>
                        <li>{tr('Say which emails are leads: the sender of your website, a word in the subject.')}</li>
                        <li>{tr('Pick the source, status and the person who follows up, then use Preview to see how the latest emails would be read.')}</li>
                        <li>{tr('Switch it on: new emails become leads with a follow-up task, and the same person writing again is added to their lead.')}</li>
                    </ol>
                </div>
            )}
            {!d && !error && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            {d && <MailDialog open={dlg.open} box={dlg.box} lookups={d} onClose={() => setDlg({ open: false, box: null })} onSaved={load} />}
            <ListDialog mode={list.mode} box={list.box} onClose={() => setList({ mode: null, box: null })} />
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this mailbox?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={async () => {
                try { await post({ action: 'delete', id: del.id }); notify('success', tr('Deleted')); setDel(null); load() } catch (e) { notify('danger', e.message) }
            }}>
                <p>{del && tr('"{name}" will stop being read. The leads already imported stay.', { name: del.email })}</p>
            </ConfirmDialog>
        </Container>
    )
}

export default LeadMailPage
