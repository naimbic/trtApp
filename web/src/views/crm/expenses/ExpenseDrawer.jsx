import { moneyHidden, MASK } from '@/utils/money'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { TbFileInvoice, TbTrash, TbRepeat } from 'react-icons/tb'
import dayjs from 'dayjs'
import AttachmentsPanel from '@/components/crm/AttachmentsPanel'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tabs from '@/components/ui/Tabs'
import CreatableSelect from 'react-select/creatable'
import { api, notify } from '../kit/api'
import RelationSelect from '../kit/RelationSelect'

const EMPTY = { name: '', categoryId: null, amount: '', taxId: null, tax2Id: null, currencyId: null, date: new Date(), reference: '', paymentModeId: null, clientId: null, projectId: null, billable: false, note: '', recurring: false, repeatEvery: 1, recurringType: 'month', cyclesLimit: 0, createInvoiceBillable: false, sendInvoiceToCustomer: false }
const L = ({ children }) => <label className="form-label mb-2 block">{children}</label>
const money = (n, cur) => moneyHidden() ? MASK : `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur?.symbol || cur?.name || ''}`.trim()

const ExpenseDrawer = ({ open, id, lookups, onClose, onChanged, onLookups }) => {
    const nav = useNavigate()
    const [v, setV] = useState(EMPTY)
    const [detail, setDetail] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirm, setConfirm] = useState(null)
    const edit = !!id
    const canEdit = edit ? detail?.can.edit : true
    const set = (p) => setV((x) => ({ ...x, ...p }))
    const lk = detail?.lookups || lookups
    const opt = (l = []) => l.map((x) => ({ value: x.id, label: x.name }))
    const pick = (l, val) => opt(l).find((o) => o.value === val) || null
    const taxOpts = (lk.taxes || []).map((t) => ({ value: t.id, label: `${t.name} (${t.rate}%)` }))
    const cur = (lk.currencies || []).find((c) => c.id === v.currencyId)

    const load = useCallback(async () => {
        if (!id) return
        try {
            const d = await api(`/api/crm/sales/expenses/${id}`)
            setDetail(d)
            const e = d.expense
            setV({ ...EMPTY, ...e, amount: e.amount, date: e.date ? new Date(e.date) : new Date() })
        } catch (e) { notify('danger', e.message); onClose() }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!open) return
        setDetail(null)
        if (id) load()
        else setV({ ...EMPTY, currencyId: (lookups.currencies || []).find((c) => c.isDefault)?.id || null })
    }, [open, id, load]) // eslint-disable-line react-hooks/exhaustive-deps

    const total = (() => { const r = (t) => (lk.taxes || []).find((x) => x.id === t)?.rate || 0; return (Number(v.amount) || 0) * (1 + (r(v.taxId) + r(v.tax2Id)) / 100) })()
    const save = async () => {
        setSaving(true)
        try {
            const r = await api(edit ? `/api/crm/sales/expenses/${id}` : '/api/crm/sales/expenses', { method: edit ? 'PUT' : 'POST', body: { ...v, date: dayjs(v.date).format('YYYY-MM-DD') } })
            notify('success', edit ? 'Expense saved' : 'Expense added'); onChanged()
            if (edit) await load(); else { nav(`/crm/expenses?open=${r.id}`, { replace: true }); onClose() }
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const newCategory = async (name) => {
        try { const r = await api('/api/crm/sales/expenses/categories', { method: 'POST', body: { name } }); await onLookups(); set({ categoryId: r.id }); notify('success', `Category “${r.name}” created`) } catch (e) { notify('danger', e.message) }
    }
    const run = async () => {
        const c = confirm; setConfirm(null)
        try {
            if (c === 'delete') { await api(`/api/crm/sales/expenses/${id}`, { method: 'DELETE' }); notify('success', 'Expense deleted'); onChanged(); onClose() }
            else { const r = await api(`/api/crm/sales/expenses/${id}/invoice`, { method: 'POST' }); notify('success', 'Invoice created'); onChanged(); nav(`/crm/invoices/${r.invoiceId}`) }
        } catch (e) { notify('danger', e.message) }
    }

    const form = (
        <div className="space-y-4">
            {detail?.expense.invoice && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/10">Invoiced on <Link className="font-semibold underline" to={`/crm/invoices/${detail.expense.invoice.id}`}>invoice {detail.expense.invoice.number}</Link>. It can no longer be changed.</div>}
            <div><L>Name</L><Input disabled={!canEdit} value={v.name} placeholder="What was it for?" onChange={(e) => set({ name: e.target.value })} /></div>
            <div><L>Category</L><Select componentAs={CreatableSelect} isDisabled={!canEdit} options={opt(lk.categories)} value={pick(lk.categories, v.categoryId)} onChange={(o) => set({ categoryId: o?.value || null })} onCreateOption={newCategory} formatCreateLabel={(t) => `Create category “${t}”`} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><L>Amount (before tax)</L><Input type="number" min={0} step="0.01" disabled={!canEdit} value={v.amount} onChange={(e) => set({ amount: e.target.value })} /></div>
                <div><L>Currency</L><Select isDisabled={!canEdit} options={(lk.currencies || []).map((c) => ({ value: c.id, label: c.name }))} value={(lk.currencies || []).filter((c) => c.id === v.currencyId).map((c) => ({ value: c.id, label: c.name }))[0] || null} onChange={(o) => set({ currencyId: o?.value || null })} /></div>
                <div><L>Tax</L><Select isClearable isDisabled={!canEdit} options={taxOpts} value={taxOpts.find((o) => o.value === v.taxId) || null} onChange={(o) => set({ taxId: o?.value || null })} /></div>
                <div><L>Second tax</L><Select isClearable isDisabled={!canEdit} options={taxOpts} value={taxOpts.find((o) => o.value === v.tax2Id) || null} onChange={(o) => set({ tax2Id: o?.value || null })} /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3 text-sm dark:bg-gray-700/50"><span className="font-semibold">Total with tax</span><span className="text-lg font-bold heading-text">{money(total, cur)}</span></div>
            <div className="grid grid-cols-2 gap-4">
                <div><L>Date</L><DatePicker disabled={!canEdit} value={v.date} onChange={(d) => set({ date: d })} /></div>
                <div><L>Payment mode</L><Select isClearable isDisabled={!canEdit} options={opt(lk.paymentModes)} value={pick(lk.paymentModes, v.paymentModeId)} onChange={(o) => set({ paymentModeId: o?.value || null })} /></div>
                <div className="col-span-2"><L>Reference #</L><Input disabled={!canEdit} value={v.reference} placeholder="Cheque, receipt or transaction number" onChange={(e) => set({ reference: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><L>Client</L><RelationSelect resource="clients" value={v.clientId} disabled={!canEdit} onChange={(x) => set({ clientId: x || null, projectId: null })} /></div>
                <div><L>Project</L><RelationSelect key={v.clientId || 'all'} resource="projects" value={v.projectId} disabled={!canEdit} onChange={(x) => set({ projectId: x || null })} /></div>
            </div>
            <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm"><div><div className="font-semibold">Billable</div><div className="text-xs text-gray-500">Can be charged to the client on an invoice</div></div><Switcher disabled={!canEdit} checked={v.billable} onChange={(c) => set({ billable: c })} /></div>
                <div className="flex items-center justify-between text-sm"><div><div className="font-semibold">Repeat this expense</div><div className="text-xs text-gray-500">Creates a copy every period (subscriptions, rent, hosting…)</div></div><Switcher disabled={!canEdit} checked={v.recurring} onChange={(c) => set({ recurring: c })} /></div>
                {v.recurring && (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <div><L>Every</L><Input type="number" min={1} disabled={!canEdit} value={v.repeatEvery} onChange={(e) => set({ repeatEvery: e.target.value })} /></div>
                            <div><L>Unit</L><Select isDisabled={!canEdit} options={['day', 'week', 'month', 'year'].map((x) => ({ value: x, label: x }))} value={{ value: v.recurringType, label: v.recurringType }} onChange={(o) => set({ recurringType: o.value })} /></div>
                            <div><L>Cycles (0 = ∞)</L><Input type="number" min={0} disabled={!canEdit} value={v.cyclesLimit} onChange={(e) => set({ cyclesLimit: e.target.value })} /></div>
                        </div>
                        {v.billable && <div className="flex items-center justify-between text-sm"><span>Invoice the client automatically each time</span><Switcher disabled={!canEdit} checked={v.createInvoiceBillable} onChange={(c) => set({ createInvoiceBillable: c })} /></div>}
                        {v.billable && v.createInvoiceBillable && <div className="flex items-center justify-between text-sm"><span>Email that invoice to the client</span><Switcher disabled={!canEdit} checked={v.sendInvoiceToCustomer} onChange={(c) => set({ sendInvoiceToCustomer: c })} /></div>}
                        {detail?.expense.cyclesDone > 0 && <p className="text-xs text-gray-500"><TbRepeat className="mr-1 inline" />Repeated {detail.expense.cyclesDone} time{detail.expense.cyclesDone === 1 ? '' : 's'}{detail.expense.lastRecurringDate ? `, last on ${dayjs(detail.expense.lastRecurringDate).format('DD MMM YYYY')}` : ''}. Automatic copies run from Settings → Cron job.</p>}
                    </>
                )}
            </div>
            <div><L>Note</L><Input textArea rows={3} disabled={!canEdit} value={v.note} onChange={(e) => set({ note: e.target.value })} /></div>
        </div>
    )

    return (
        <Drawer
            title={edit ? (detail?.expense.name || 'Expense') : 'New expense'} isOpen={open} onClose={onClose} onRequestClose={onClose} width={560}
            footer={
                <div className="flex w-full items-center gap-2">
                    {edit && detail?.can.delete && <Button variant="plain" className="text-red-500" icon={<TbTrash />} onClick={() => setConfirm('delete')}>Delete</Button>}
                    {edit && detail?.can.invoice && <Button icon={<TbFileInvoice />} onClick={() => setConfirm('invoice')}>To invoice</Button>}
                    <div className="ml-auto flex gap-2"><Button onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>{canEdit && <Button variant="solid" loading={saving} onClick={save}>{edit ? 'Save changes' : 'Add expense'}</Button>}</div>
                </div>
            }
        >
            {edit && !detail ? <div className="py-10 text-center text-gray-500">Loading…</div> : edit ? (
                <Tabs defaultValue="details">
                    <Tabs.TabList><Tabs.TabNav value="details">Details</Tabs.TabNav><Tabs.TabNav value="receipts">Receipts</Tabs.TabNav></Tabs.TabList>
                    <div className="pt-4">
                        <Tabs.TabContent value="details">{form}</Tabs.TabContent>
                        <Tabs.TabContent value="receipts"><AttachmentsPanel relType="expense" relId={id} canEdit={canEdit} /></Tabs.TabContent>
                    </div>
                </Tabs>
            ) : <>{form}<p className="mt-4 text-xs text-gray-500">Save the expense first, then attach the receipt.</p></>}
            <ConfirmDialog isOpen={!!confirm} type={confirm === 'delete' ? 'danger' : 'info'} title={confirm === 'delete' ? 'Delete this expense?' : 'Create an invoice?'} confirmText={confirm === 'delete' ? 'Delete' : 'Create invoice'} onClose={() => setConfirm(null)} onCancel={() => setConfirm(null)} onConfirm={run}>
                <p>{confirm === 'delete' ? 'The expense and its receipts are removed for good.' : 'An unpaid invoice with this expense and its taxes is created for the client. The expense is then locked.'}</p>
            </ConfirmDialog>
        </Drawer>
    )
}

export default ExpenseDrawer
