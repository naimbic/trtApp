/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { api, notify } from '../kit/api'
import { useClientLookups, makeMoney } from '../clients/shared'
import { tr } from '@/utils/t'

export const STATUS = {
    paid: { label: () => tr('Paid'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    partial: { label: () => tr('Partly paid'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    late: { label: () => tr('Late'), cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
    due: { label: () => tr('To pay'), cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
    none: { label: () => '–', cls: 'text-gray-400' },
}
export const StatusTag = ({ s }) => <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${STATUS[s]?.cls || ''}`}>{(STATUS[s] || STATUS.none).label()}</span>

export const KIND_LABEL = { salary: () => tr('Salary'), advance: () => tr('Advance'), bonus: () => tr('Bonus'), other: () => tr('Other') }

/** Currency options and the money formatter of the CRM. */
export function usePayMoney() {
    const lookups = useClientLookups()
    const currencies = lookups.currencies || []
    const money = makeMoney(currencies)
    const options = currencies.map((c) => ({ value: c.id, label: c.symbol ? `${c.name} (${c.symbol})` : c.name }))
    const defaultId = (currencies.find((c) => c.isDefault) || currencies[0])?.id || null
    return { money, currencies, options, defaultId }
}

const Field = ({ label, children }) => <div><label className="form-label mb-1 block">{label}</label>{children}</div>

/** Set the monthly salary of a member. */
export const SalaryDialog = ({ open, onClose, staffId, name, salary, onSaved }) => {
    const { options, defaultId } = usePayMoney()
    const [v, setV] = useState({ amount: '', currencyId: null, payDay: '', start: '' })
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) setV({ amount: salary?.amount || '', currencyId: salary?.currencyId || defaultId, payDay: salary?.payDay || '', start: salary?.start || '' }) }, [open, salary, defaultId])
    const save = async () => {
        setBusy(true)
        try { await api(`/api/crm/payroll/${staffId}`, { method: 'PUT', body: v }); notify('success', tr('Salary saved')); onSaved?.(); onClose() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={460} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1 pr-10">{tr('Monthly salary')}</h5>
            <p className="mb-4 text-sm text-gray-500">{name}</p>
            <div className="grid grid-cols-2 gap-3">
                <Field label={tr('Amount per month')}><Input type="number" min="0" step="0.01" autoFocus value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
                <Field label={tr('Currency')}><Select options={options} value={options.find((o) => o.value === v.currencyId) || null} onChange={(o) => setV({ ...v, currencyId: o?.value || null })} /></Field>
                <Field label={tr('Paid on day')}><Input type="number" min="1" max="31" placeholder="28" value={v.payDay} onChange={(e) => setV({ ...v, payDay: e.target.value })} /></Field>
                <Field label={tr('First month due')}><Input type="month" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} /></Field>
            </div>
            <p className="mt-3 text-xs text-gray-400">{tr('Leave the amount empty for no salary. Only super administrators see salaries and payments.')}</p>
            <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button><Button variant="solid" loading={busy} onClick={save}>{tr('Save')}</Button></div>
        </Dialog>
    )
}

/** Record (or edit) a payment to a member: salary, advance, bonus or other. preset fills the form; edit = the payment being changed. */
export const PaymentDialog = ({ open, onClose, staffId, name, preset, edit, onSaved }) => {
    const { options, defaultId } = usePayMoney()
    const [v, setV] = useState({})
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (!open) return
        setV(edit ? { month: edit.month, kind: edit.kind, amount: edit.amount, currencyId: edit.currencyId || defaultId, paidDate: dayjs(edit.paidDate).format('YYYY-MM-DD'), method: edit.method, note: edit.note }
            : { month: dayjs().format('YYYY-MM'), kind: 'salary', amount: '', currencyId: defaultId, paidDate: dayjs().format('YYYY-MM-DD'), method: '', note: '', ...(preset || {}) })
    }, [open, edit, preset, defaultId])
    const kinds = Object.keys(KIND_LABEL).map((k) => ({ value: k, label: KIND_LABEL[k]() }))
    const save = async () => {
        setBusy(true)
        try {
            await api(edit ? `/api/crm/payroll/payments/${edit.id}` : '/api/crm/payroll/payments', { method: edit ? 'PATCH' : 'POST', body: { ...v, staffId } })
            notify('success', tr('Payment saved')); onSaved?.(); onClose()
        } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <Dialog isOpen={open} width={480} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-1 pr-10">{edit ? tr('Edit payment') : tr('Record a payment')}</h5>
            <p className="mb-4 text-sm text-gray-500">{name}</p>
            <div className="grid grid-cols-2 gap-3">
                <Field label={tr('Type')}><Select isSearchable={false} options={kinds} value={kinds.find((o) => o.value === v.kind) || null} onChange={(o) => setV({ ...v, kind: o?.value || 'salary' })} /></Field>
                <Field label={tr('For the month')}><Input type="month" value={v.month || ''} onChange={(e) => setV({ ...v, month: e.target.value })} /></Field>
                <Field label={tr('Amount')}><Input type="number" min="0" step="0.01" autoFocus value={v.amount ?? ''} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
                <Field label={tr('Currency')}><Select options={options} value={options.find((o) => o.value === v.currencyId) || null} onChange={(o) => setV({ ...v, currencyId: o?.value || null })} /></Field>
                <Field label={tr('Paid on')}><Input type="date" value={v.paidDate || ''} onChange={(e) => setV({ ...v, paidDate: e.target.value })} /></Field>
                <Field label={tr('Method')}><Input placeholder={tr('Transfer, cash, cheque…')} value={v.method || ''} onChange={(e) => setV({ ...v, method: e.target.value })} /></Field>
                <div className="col-span-2"><Field label={tr('Note')}><Input value={v.note || ''} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field></div>
            </div>
            <p className="mt-3 text-xs text-gray-400">{tr('A salary or an advance pays the salary of the month; a bonus or other payment is an extra cost.')}</p>
            <div className="mt-5 flex justify-end gap-2"><Button onClick={onClose}>{tr('Cancel')}</Button><Button variant="solid" loading={busy} onClick={save}>{tr('Save')}</Button></div>
        </Dialog>
    )
}
