import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Checkbox from '@/components/ui/Checkbox'
import { api, notify } from '../kit/api'
import { fmtDate } from './shared'
import { tr } from '@/utils/t'

/** Clean-up of the old balances: invoices older than N years still unpaid or partly paid, to mark as lost in one go (they leave the balances, reminders and the client area). */
const OldUnpaidDialog = ({ open, money, onClose, onDone }) => {
    const [years, setYears] = useState(2)
    const [list, setList] = useState(null)
    const [sel, setSel] = useState([])
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (!open) return
        setList(null)
        api(`/api/crm/sales/invoices/old?years=${years}`).then((r) => { setList(r.list); setSel(r.list.map((x) => x.id)) }).catch((e) => notify('danger', e.message))
    }, [open, years])
    if (!open) return null
    const opts = [1, 2, 3, 5].map((y) => ({ value: y, label: tr("older than {n} year(s)", { n: y }) }))
    const total = (list || []).filter((x) => sel.includes(x.id))
    const sum = total.reduce((a, x) => a + x.due, 0)
    const run = async () => {
        setBusy(true)
        try { const r = await api('/api/crm/sales/invoices/bulk-lost', { method: 'POST', body: { ids: sel, lost: true } }); notify('success', tr("{n} invoice(s) marked as lost", { n: r.changed })); onDone(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen width={760} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1">{tr("Old unpaid invoices")}</h5>
            <p className="mb-3 text-sm text-gray-500">{tr("Invoices still unpaid or partly paid after a long time. Mark them as lost to take them out of the balances, the overdue list, the reminders and the client area. They stay in the Lost filter and can be restored at any time.")}</p>
            <div className="mb-3 w-56"><Select size="sm" isSearchable={false} options={opts} value={opts.find((o) => o.value === years)} onChange={(o) => setYears(o.value)} /></div>
            {!list ? <p className="py-8 text-center text-gray-400">{tr("Loading…")}</p> : !list.length ? <p className="py-8 text-center text-emerald-600">{tr("No old unpaid invoice. Everything is clean.")}</p> : (
                <div className="max-h-[48vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm"><thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 dark:bg-gray-800"><tr><th className="w-8 p-2"><Checkbox checked={sel.length === list.length} onChange={(c) => setSel(c ? list.map((x) => x.id) : [])} /></th><th className="p-2 text-start">{tr("Invoice")}</th><th className="p-2 text-start">{tr("Client")}</th><th className="p-2 text-start">{tr("Date")}</th><th className="p-2 text-end">{tr("Total")}</th><th className="p-2 text-end">{tr("Still due")}</th></tr></thead>
                        <tbody>{list.map((x) => <tr key={x.id} className="border-t border-gray-100 dark:border-gray-700"><td className="p-2"><Checkbox checked={sel.includes(x.id)} onChange={(c) => setSel(c ? [...sel, x.id] : sel.filter((i) => i !== x.id))} /></td><td className="p-2"><a className="text-primary hover:underline" href={`/crm/invoices/${x.id}`} target="_blank" rel="noreferrer">{x.number}</a></td><td className="p-2">{x.client}</td><td className="p-2 whitespace-nowrap">{fmtDate(x.date)}</td><td className="p-2 text-end whitespace-nowrap">{money(x.total, x.currencyId)}</td><td className="p-2 text-end font-semibold whitespace-nowrap text-red-600">{money(x.due, x.currencyId)}</td></tr>)}</tbody></table>
                </div>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">{list?.length ? `${total.length} ${tr("selected")}${new Set(total.map((x) => x.currencyId)).size <= 1 && total[0] ? ` · ${money(sum, total[0].currencyId)}` : ''}` : ''}</span>
                <div className="flex gap-2"><Button onClick={onClose}>{tr("Close")}</Button><Button variant="solid" disabled={!sel.length} loading={busy} onClick={run}>{tr("Mark selected as lost")}</Button></div>
            </div>
        </Dialog>
    )
}

export default OldUnpaidDialog
