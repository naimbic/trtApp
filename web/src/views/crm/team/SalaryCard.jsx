/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { TbCash, TbPencil, TbPlus, TbTrash } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { api, notify } from '../kit/api'
import { SalaryDialog, PaymentDialog, StatusTag, KIND_LABEL, usePayMoney } from './PayrollParts'
import { tr } from '@/utils/t'

const Tile = ({ label, value, sub }) => (
    <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="text-[11px] text-gray-400">{label}</div>
        <div className="text-base font-extrabold">{value}</div>
        {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
)

/** Salary and payments of one member (super administrators only): what is due each month and what was paid. */
const SalaryCard = ({ staffId, name }) => {
    const { money, defaultId } = usePayMoney()
    const [d, setD] = useState(null)
    const [salaryDlg, setSalaryDlg] = useState(false)
    const [pay, setPay] = useState({ open: false, preset: null, edit: null })
    const [del, setDel] = useState(null)
    const load = useCallback(() => api(`/api/crm/payroll/${staffId}`).then(setD).catch(() => setD(null)), [staffId])
    useEffect(() => { load() }, [load])
    if (!d) return null
    const cur = d.salary.currencyId || defaultId
    const dueName = dayjs(`${d.dueMonth}-01`).format('MMMM')
    const thisMonth = d.months.find((m) => m.month === d.dueMonth)
    const year = d.months
    const paidYear = d.payments.filter((p) => p.month.startsWith(d.current.slice(0, 4))).reduce((n, p) => n + p.amount, 0)
    const unpaid = d.months.filter((m) => m.status === 'late' || m.status === 'partial').reduce((n, m) => n + (m.due - m.paid), 0)
    const remove = async () => {
        const p = del; setDel(null)
        try { await api(`/api/crm/payroll/payments/${p.id}`, { method: 'DELETE' }); notify('success', tr('Payment deleted')); load() } catch (e) { notify('danger', e.message) }
    }
    return (
        <section className="pt-card">
            <h3>
                {tr('Salary & payments')}
                <span className="flex gap-1.5">
                    <Button size="xs" icon={<TbPencil />} onClick={() => setSalaryDlg(true)}>{tr('Salary')}</Button>
                    <Button size="xs" icon={<TbPlus />} onClick={() => setPay({ open: true, preset: d.salary.amount ? { month: d.dueMonth, amount: d.salary.amount, currencyId: cur } : { month: d.dueMonth }, edit: null })}>{tr('Payment')}</Button>
                    {d.salary.amount > 0 && thisMonth && thisMonth.status !== 'paid' && thisMonth.status !== 'none' && <Button size="xs" variant="solid" icon={<TbCash />} onClick={() => setPay({ open: true, edit: null, preset: { month: d.dueMonth, kind: 'salary', amount: Math.max(0, thisMonth.due - thisMonth.paid), currencyId: cur } })}>{tr('Pay {month}', { month: dueName })}</Button>}
                </span>
            </h3>
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                <Tile label={tr('Monthly salary')} value={d.salary.amount ? money(d.salary.amount, cur) : '–'} sub={[d.salary.payDay ? (d.arrears ? tr('Paid on day {n} of the next month', { n: d.salary.payDay }) : tr('Paid on day {n}', { n: d.salary.payDay })) : null, d.salary.cnss ? tr('CNSS') : null].filter(Boolean).join(' · ') || null} />
                <Tile label={tr('To pay: {month}', { month: dueName })} value={thisMonth ? <StatusTag s={thisMonth.status} /> : '–'} sub={thisMonth?.due ? `${money(thisMonth.paid, cur)} / ${money(thisMonth.due, cur)}` : null} />
                <Tile label={tr('Paid this year')} value={money(paidYear, cur)} />
                <Tile label={tr('Unpaid')} value={unpaid > 0 ? <span className="text-red-500">{money(unpaid, cur)}</span> : '–'} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-gray-400"><th className="py-1 font-semibold">{tr('Month')}</th><th className="text-right font-semibold">{tr('Due')}</th><th className="text-right font-semibold">{tr('Paid')}</th><th className="text-right font-semibold">{tr('Extra')}</th><th className="pl-3 font-semibold">{tr('Status')}</th><th /></tr></thead>
                    <tbody>
                        {[...year].reverse().map((m) => (
                            <tr key={m.month} className="border-t border-gray-100 dark:border-gray-700">
                                <td className="py-1.5">{dayjs(`${m.month}-01`).format('MMMM YYYY')}</td>
                                <td className="text-right text-gray-500">{m.due ? money(m.due, cur) : '–'}</td>
                                <td className="text-right font-semibold">{m.paid ? money(m.paid, cur) : '–'}</td>
                                <td className="text-right text-gray-500">{m.extra ? money(m.extra, cur) : '–'}</td>
                                <td className="pl-3"><StatusTag s={m.status} /></td>
                                <td className="text-right">{(m.status === 'late' || m.status === 'partial' || m.status === 'due') && <Button size="xs" variant="plain" onClick={() => setPay({ open: true, edit: null, preset: { month: m.month, kind: 'salary', amount: Math.max(0, m.due - m.paid), currencyId: cur } })}>{tr('Pay')}</Button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {d.payments.length > 0 && (
                <>
                    <h3 style={{ margin: '22px 0 6px', fontSize: 13 }}>{tr('Payments')}</h3>
                    {d.payments.slice(0, 20).map((p) => (
                        <div key={p.id} className="flex items-center gap-3 border-t border-gray-100 py-2 text-sm dark:border-gray-700">
                            <span className="w-20 shrink-0 text-xs text-gray-400">{dayjs(p.paidDate).format('DD MMM YYYY')}</span>
                            <span className="min-w-0 flex-1 truncate"><b>{KIND_LABEL[p.kind]()}</b> · {dayjs(`${p.month}-01`).format('MMM YYYY')}{p.method ? ` · ${p.method}` : ''}{p.note ? ` · ${p.note}` : ''}</span>
                            <span className="font-semibold">{money(p.amount, p.currencyId || cur)}</span>
                            <button type="button" className="text-gray-400 hover:text-primary" aria-label={tr('Edit')} onClick={() => setPay({ open: true, preset: null, edit: p })}><TbPencil /></button>
                            <button type="button" className="text-gray-400 hover:text-red-500" aria-label={tr('Delete')} onClick={() => setDel(p)}><TbTrash /></button>
                        </div>
                    ))}
                </>
            )}
            <SalaryDialog open={salaryDlg} onClose={() => setSalaryDlg(false)} staffId={staffId} name={name} salary={d.salary} onSaved={load} />
            <PaymentDialog open={pay.open} onClose={() => setPay({ open: false, preset: null, edit: null })} staffId={staffId} name={name} preset={pay.preset} edit={pay.edit} rib={d.salary.rib} cnss={d.salary.cnss} onSaved={load} />
            <ConfirmDialog isOpen={!!del} type="danger" title={tr('Delete this payment?')} confirmText={tr('Delete')} onClose={() => setDel(null)} onRequestClose={() => setDel(null)} onCancel={() => setDel(null)} onConfirm={remove}>
                <p>{del && `${KIND_LABEL[del.kind]()} · ${money(del.amount, del.currencyId || cur)} · ${dayjs(`${del.month}-01`).format('MMM YYYY')}`}</p>
            </ConfirmDialog>
        </section>
    )
}

export default SalaryCard
