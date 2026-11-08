/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { TbChartBar, TbCompass, TbPlus, TbPencil, TbSend, TbTrash, TbChevronDown } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Tooltip from '@/components/ui/Tooltip'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import { api, notify } from '../kit/api'
import cn from '@/utils/classNames'
import { tr } from '@/utils/t'

const KIND = { report: { label: 'Report', Icon: TbChartBar, bg: 'bg-blue-50 dark:bg-blue-500/10', dot: 'bg-blue-500', text: 'text-blue-800 dark:text-blue-300' }, strategy: { label: 'Strategy', Icon: TbCompass, bg: 'bg-violet-50 dark:bg-violet-500/10', dot: 'bg-violet-500', text: 'text-violet-800 dark:text-violet-300' } }
const STATUS = { draft: ['Draft', 'bg-gray-200 text-gray-700'], sent: ['Sent', 'bg-sky-100 text-sky-700'], approved: ['Approved', 'bg-emerald-100 text-emerald-700'], declined: ['Declined', 'bg-rose-100 text-rose-700'] }
const L = ({ children }) => <label className="mb-1 block text-xs font-semibold text-gray-500">{children}</label>

/** The Reports & Strategies tab of a client: reports to send and strategies to propose, kept like requests (staff side for now). */
const ClientReports = ({ clientId }) => {
    const [d, setD] = useState(null)
    const [filter, setFilter] = useState('all')
    const [open, setOpen] = useState([])
    const [dlg, setDlg] = useState(null) // the one being written
    const [send, setSend] = useState(null) // { item, ids, message }
    const [del, setDel] = useState(null)
    const [busy, setBusy] = useState(false)
    const load = useCallback(() => api(`/api/crm/client-reports?clientId=${clientId}`).then(setD).catch((e) => notify('danger', e.message)), [clientId])
    useEffect(() => { load() }, [load])
    const list = useMemo(() => (d?.list || []).filter((x) => filter === 'all' || x.kind === filter), [d, filter])
    const can = d?.can || {}
    const toggle = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
    const save = async () => {
        setBusy(true)
        try { await api(dlg.id ? `/api/crm/client-reports/${dlg.id}` : '/api/crm/client-reports', { method: dlg.id ? 'PUT' : 'POST', body: { ...dlg, clientId } }); notify('success', tr('Saved')); setDlg(null); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const doSend = async () => {
        setBusy(true)
        try { const r = await api(`/api/crm/client-reports/${send.item.id}/send`, { method: 'POST', body: { clientId, contactIds: send.ids, message: send.message } }); notify('success', tr('Sent to {n} contact(s)', { n: r.sent.length })); setSend(null); load() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    const setStatus = (x, status) => api(`/api/crm/client-reports/${x.id}`, { method: 'PUT', body: { clientId, status } }).then(load).catch((e) => notify('danger', e.message))
    const kinds = [['all', tr('All')], ['report', tr('Reports')], ['strategy', tr('Strategies')]]
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1">{kinds.map(([k, label]) => <button key={k} type="button" onClick={() => setFilter(k)} className={cn('rounded-full px-3 py-1 text-sm font-semibold transition', filter === k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200')}>{label}</button>)}</div>
                {can.create && <div className="ms-auto flex gap-2"><Button size="sm" icon={<TbCompass />} onClick={() => setDlg({ kind: 'strategy', title: '', body: '', period: '', status: 'draft' })}>{tr('New strategy')}</Button><Button size="sm" variant="solid" icon={<TbPlus />} onClick={() => setDlg({ kind: 'report', title: '', body: '', period: dayjs().format('MMMM YYYY'), status: 'draft' })}>{tr('New report')}</Button></div>}
            </div>
            {!d ? <p className="py-10 text-center text-gray-400">{tr('Loading…')}</p> : !list.length ? <p className="py-10 text-center text-gray-400">{tr('Nothing here yet. Write a report to send to this client, or propose a strategy.')}</p> : (
                <div className="flex flex-col gap-2">
                    {list.map((x) => {
                        const k = KIND[x.kind] || KIND.report, isOpen = open.includes(x.id), [sl, sc] = STATUS[x.status] || STATUS.draft
                        return (
                            <div key={x.id} className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white dark:border-gray-700 dark:bg-gray-800">
                                <div className={cn('flex items-center gap-2 px-3.5 py-2.5', k.bg)}>
                                    <button type="button" aria-expanded={isOpen} onClick={() => toggle(x.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
                                        <span className={cn('size-2.5 shrink-0 rounded-full', k.dot)} />
                                        <span className="min-w-0"><span className={cn('block truncate font-semibold', k.text)}>{x.title}</span><span className="block truncate text-xs text-gray-500">{tr(k.label)}{x.period ? ` · ${x.period}` : ''} · {dayjs(x.createdAt).format('DD MMM YYYY')}{x.by ? ` · ${x.by}` : ''}</span></span>
                                        <span className={cn('ms-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', sc)}>{tr(sl)}</span>
                                        <TbChevronDown className={cn('shrink-0 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
                                    </button>
                                    {can.edit && <Tooltip title={tr('Send by email')}><Button size="xs" variant="plain" icon={<TbSend />} onClick={() => setSend({ item: x, ids: (d.contacts.filter((c) => c.primary)[0] ? [d.contacts.filter((c) => c.primary)[0].id] : d.contacts.slice(0, 1).map((c) => c.id)), message: '' })} /></Tooltip>}
                                    {can.edit && <Tooltip title={tr('Edit')}><Button size="xs" variant="plain" icon={<TbPencil />} onClick={() => setDlg({ id: x.id, kind: x.kind, title: x.title, body: x.body, period: x.period, status: x.status })} /></Tooltip>}
                                    {can.delete && <Tooltip title={tr('Delete')}><Button size="xs" variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setDel(x)} /></Tooltip>}
                                </div>
                                {isOpen && (
                                    <div className="space-y-3 p-4">
                                        {x.body ? <RichView html={x.body} /> : <p className="text-sm text-gray-400">{tr('No text yet.')}</p>}
                                        {x.sentAt && <p className="text-xs text-gray-500">{tr('Sent on {date} to {to}', { date: dayjs(x.sentAt).format('DD MMM YYYY, HH:mm'), to: x.sentTo.join(', ') })}</p>}
                                        {can.edit && x.status !== 'draft' && <div className="flex flex-wrap items-center gap-1.5 text-xs"><span className="font-semibold text-gray-500">{tr('The client answered')}:</span>{['sent', 'approved', 'declined'].map((s) => <button key={s} type="button" onClick={() => setStatus(x, s)} className={cn('rounded-full px-2.5 py-0.5 font-semibold', x.status === s ? STATUS[s][1] : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700')}>{tr(s === 'sent' ? 'No answer yet' : STATUS[s][0])}</button>)}</div>}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
            <Dialog isOpen={!!dlg} width={680} onClose={() => setDlg(null)} onRequestClose={() => setDlg(null)}>
                <h5 className="mb-3">{dlg?.id ? tr('Edit') : dlg?.kind === 'strategy' ? tr('New strategy') : tr('New report')}</h5>
                {dlg && (
                    <div className="max-h-[70vh] space-y-3 overflow-y-auto pe-1">
                        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                            <div><L>{tr('Title')}</L><Input size="sm" autoFocus value={dlg.title} placeholder={dlg.kind === 'strategy' ? tr('Strategy for the next quarter') : tr('Monthly report')} onChange={(e) => setDlg({ ...dlg, title: e.target.value })} /></div>
                            <div><L>{tr('Kind')}</L><Select size="sm" isSearchable={false} options={[{ value: 'report', label: tr('Report') }, { value: 'strategy', label: tr('Strategy') }]} value={{ value: dlg.kind, label: tr(KIND[dlg.kind].label) }} onChange={(o) => setDlg({ ...dlg, kind: o.value })} /></div>
                        </div>
                        <div><L>{dlg.kind === 'strategy' ? tr('Period it covers (optional)') : tr('Period of the report')}</L><Input size="sm" value={dlg.period} placeholder={tr('October 2026')} onChange={(e) => setDlg({ ...dlg, period: e.target.value })} /></div>
                        <div><L>{tr('Content')}</L><RichEditor minHeight={200} value={dlg.body} onChange={(html) => setDlg((x) => ({ ...x, body: html }))} placeholder={dlg.kind === 'strategy' ? tr('Goals, actions, timing and budget...') : tr('What was done, the results, what comes next...')} /></div>
                    </div>
                )}
                <div className="mt-4 flex justify-end gap-2"><Button size="sm" onClick={() => setDlg(null)}>{tr('Cancel')}</Button><Button size="sm" variant="solid" loading={busy} onClick={save}>{tr('Save')}</Button></div>
            </Dialog>
            <Dialog isOpen={!!send} width={520} onClose={() => setSend(null)} onRequestClose={() => setSend(null)}>
                <h5 className="mb-1">{tr('Send by email')}</h5>
                <p className="mb-3 text-sm text-gray-500">{send?.item.title}</p>
                {send && (
                    <div className="space-y-3">
                        <div><L>{tr('To')}</L>
                            {d.contacts.length ? d.contacts.map((c) => <label key={c.id} className="mb-1 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={send.ids.includes(c.id)} onChange={(e) => setSend({ ...send, ids: e.target.checked ? [...send.ids, c.id] : send.ids.filter((i) => i !== c.id) })} />{c.name} <span className="text-xs text-gray-500">{c.email}</span>{c.primary && <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">{tr('Primary')}</span>}</label>) : <p className="text-sm text-amber-600">{tr('This client has no contact with an email address.')}</p>}
                        </div>
                        <div><L>{tr('A message (optional)')}</L><Input textArea rows={3} value={send.message} onChange={(e) => setSend({ ...send, message: e.target.value })} placeholder={tr('Hello, here is our report for this month...')} /></div>
                    </div>
                )}
                <div className="mt-4 flex justify-end gap-2"><Button size="sm" onClick={() => setSend(null)}>{tr('Cancel')}</Button><Button size="sm" variant="solid" icon={<TbSend />} loading={busy} disabled={!send?.ids.length} onClick={doSend}>{tr('Send')}</Button></div>
            </Dialog>
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={() => { const x = del; setDel(null); api(`/api/crm/client-reports/${x.id}?clientId=${clientId}`, { method: 'DELETE' }).then(load).catch((e) => notify('danger', e.message)) }}><p>{tr('It is removed for good.')}</p></ConfirmDialog>
        </div>
    )
}

export default ClientReports
