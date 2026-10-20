/*! © 2026 TRT Digital — trtCRM. */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { TbCash, TbCalendarDollar, TbReportMoney, TbAlertTriangle, TbChevronLeft, TbChevronRight } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import StaffRing from '@/components/crm/StaffRing'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { api } from '../kit/api'
import { PaymentDialog, StatusTag, usePayMoney } from './PayrollParts'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()

/** Cost of the team by month: bars for what was paid against what the salaries make due. */
const CostChart = ({ months, money, base, current }) => {
    const top = Math.max(1, ...months.map((m) => Math.max(m.paid, m.expected)))
    return (
        <section className="pt-card mb-4">
            <h3>{tr('Team cost by month')}<span className="flex gap-3 text-[11px] font-semibold text-gray-500"><span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-sm bg-emerald-500" />{tr('Paid')}</span><span className="inline-flex items-center gap-1"><i className="inline-block h-0 w-3 border-t-2 border-gray-400/70" />{tr('Due')}</span></span></h3>
            <div className="flex h-44 items-end gap-2">
                {months.map((m) => (
                    <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${dayjs(`${m.month}-01`).format('MMMM YYYY')} · ${tr('Paid')} ${money(m.paid, base)} / ${tr('Due')} ${money(m.expected, base)}`}>
                        <div className="relative flex w-full flex-1 flex-col justify-end">
                            {m.expected > 0 && <div className="absolute inset-x-[-2px] border-t-2 border-gray-400/70" style={{ bottom: `${(m.expected / top) * 100}%` }} />}
                            <div className={`w-full rounded-t ${m.paid >= m.expected && m.expected > 0 ? 'bg-emerald-500' : m.month > current ? 'bg-gray-200' : 'bg-amber-400'}`} style={{ height: `${(m.paid / top) * 100}%` }} />
                        </div>
                        <div className={`mt-1 text-[11px] ${m.month === current ? 'font-bold text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>{dayjs(`${m.month}-01`).format('MMM')}</div>
                    </div>
                ))}
            </div>
        </section>
    )
}

/** What the team costs: salaries due, what was paid, who is still to pay this month. Super administrators only. */
const Payroll = () => {
    const navigate = useNavigate()
    const { money } = usePayMoney()
    const [year, setYear] = useState(dayjs().year())
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    const [pay, setPay] = useState({ open: false, member: null, preset: null })
    const load = useCallback(() => { api(`/api/crm/payroll?year=${year}`).then((x) => { setD(x); setError('') }).catch((e) => setError(e.message)) }, [year])
    useEffect(() => { setD(null); load() }, [load])
    const base = d?.baseCurrencyId
    const dueName = d?.dueMonth ? dayjs(`${d.dueMonth}-01`).format('MMMM') : ''

    return (
        <Container>
            <InvoiceHead
                title={tr('Payroll')}
                stats={[
                    { icon: <TbCash />, label: tr('Monthly payroll'), value: d ? money(d.totals.monthlyPayroll, base) : '–' },
                    { icon: <TbCalendarDollar />, label: tr('Paid for {month}', { month: dueName }), value: d ? money(d.totals.paidThisMonth, base) : '–' },
                    { icon: <TbReportMoney />, label: tr('Paid in {year}', { year }), value: d ? money(d.totals.yearPaid, base) : '–' },
                    { icon: <TbAlertTriangle />, label: tr('Still to pay for {month}', { month: dueName }), value: d ? String(d.totals.late) : '–' },
                ]}
            />
            <div className="cx-tools">
                <Button size="sm" variant="plain" icon={<TbChevronLeft />} onClick={() => setYear(year - 1)} />
                <span className="min-w-[3rem] text-center font-bold">{year}</span>
                <Button size="sm" variant="plain" icon={<TbChevronRight />} disabled={year >= dayjs().year()} onClick={() => setYear(year + 1)} />
                <span className="text-xs text-gray-400">{tr('Amounts in the default currency')}</span>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            {d && <CostChart months={d.months} money={money} base={base} current={d.current} />}
            <div className="overflow-x-auto">
                <Table hoverable>
                    <THead><Tr><Th>{tr('Member')}</Th><Th className="text-right">{tr('Monthly salary')}</Th><Th>{tr('Paid on day')}</Th><Th>{tr('Due: {month}', { month: dueName })}</Th><Th className="text-right">{tr('Paid in {year}', { year })}</Th><Th /></Tr></THead>
                    <TBody>
                        {(d?.members || []).map((m) => (
                            <Tr key={m.id} className="cursor-pointer" onClick={() => navigate(`/crm/staff/${m.id}`)}>
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <StaffRing id={m.id} size={30}><Avatar size={30} shape="circle" src={m.image || undefined}>{initials(m.name)}</Avatar></StaffRing>
                                        <div className="min-w-0"><div className="truncate font-semibold heading-text">{m.name}</div>{m.jobTitle && <div className="truncate text-xs text-gray-500">{m.jobTitle}</div>}</div>
                                    </div>
                                </Td>
                                <Td className="text-right font-semibold">{m.salary ? money(m.salary, m.currencyId || base) : <span className="text-gray-400">–</span>}</Td>
                                <Td className="text-gray-500">{m.payDay || '–'}</Td>
                                <Td><div className="flex items-center gap-2"><StatusTag s={m.thisMonth.status} />{m.thisMonth.due > 0 && <span className="text-xs text-gray-400">{money(m.thisMonth.paid, m.currencyId || base)} / {money(m.thisMonth.due, m.currencyId || base)}</span>}</div></Td>
                                <Td className="text-right">{money(m.yearPaid, base)}</Td>
                                <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                                    {['late', 'partial', 'due'].includes(m.thisMonth.status) && <Button size="xs" onClick={() => setPay({ open: true, member: m, preset: { month: d.dueMonth, kind: 'salary', amount: Math.max(0, m.thisMonth.due - m.thisMonth.paid), currencyId: m.currencyId } })}>{tr('Pay')}</Button>}
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </div>
            {d && !d.members.length && <div className="py-10 text-center text-gray-400">{tr('No team members to show')}</div>}
            {!d && !error && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            <p className="mt-4 text-xs text-gray-400">{tr('Only super administrators see this page. Set a salary and record payments on each member\'s profile.')}</p>
            <PaymentDialog open={pay.open} onClose={() => setPay({ open: false, member: null, preset: null })} staffId={pay.member?.id} name={pay.member?.name} preset={pay.preset} rib={pay.member?.rib} cnss={pay.member?.cnss} onSaved={load} />
        </Container>
    )
}

export default Payroll
