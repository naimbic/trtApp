/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { TbFlame, TbClock, TbUsers, TbAlarm } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Avatar from '@/components/ui/Avatar'
import Segment from '@/components/ui/Segment'
import Table from '@/components/ui/Table'
import StaffRing from '@/components/crm/StaffRing'
import { InvoiceHead } from '../sales/InvoiceInsights'
import { api } from '../kit/api'
import { tr } from '@/utils/t'

const { Tr, Th, Td, THead, TBody } = Table
export const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
export const hm = (h) => { const m = Math.round((h || 0) * 60); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}` }
export const clock = (m) => (m === null || m === undefined ? '–' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)

const monday = (d) => d.subtract((d.day() + 6) % 7, 'day')
const rangeOf = (k) => {
    const now = dayjs()
    if (k === 'today') return [now, now]
    if (k === 'week') return [monday(now), now]
    if (k === 'last') return [monday(now).subtract(7, 'day'), monday(now).subtract(1, 'day')]
    if (k === 'month') return [now.startOf('month'), now]
    return [now.subtract(29, 'day'), now]
}

/**
 * The last days as bars, easy to read: the bar is the active time that day, green up to the hours expected,
 * amber above (overtime), blue when under; the dash is the expected hours. Hover a bar for the details.
 */
export const WorkChart = ({ wh, title }) => {
    const rows = wh.rows
    const top = Math.max(4, Math.ceil(Math.max(...rows.map((r) => Math.max(r.hours, r.expected)))))
    const H = 110
    return (
        <section className="pt-card">
            <h3>{title || tr('Last 14 days')}<span className="text-sm font-semibold text-gray-500">{hm(wh.totals.active)} / {hm(wh.totals.expected)}</span></h3>
            <div className="relative" style={{ height: H + 22 }}>
                {[0, 0.5, 1].map((f) => (
                    <div key={f} className="absolute inset-x-0 border-t border-dashed border-gray-200 dark:border-gray-700" style={{ bottom: 22 + H * f }}><span className="absolute -top-2 left-0 bg-white pr-1 text-[10px] text-gray-400 dark:bg-gray-800">{Math.round(top * f)}h</span></div>
                ))}
                <div className="absolute inset-x-6 bottom-0 flex items-end justify-between gap-[3px]" style={{ height: H + 22 }}>
                    {rows.map((r) => {
                        const used = Math.min(r.hours, r.expected)
                        const over = Math.max(0, r.hours - r.expected)
                        const tip = `${dayjs(r.day).format('ddd DD MMM')} · ${r.hours ? hm(r.hours) : tr('No activity')}${r.input ? ` (${tr('moving')} ${hm(r.input)})` : ''}${r.expected ? ` / ${hm(r.expected)}` : ''}${r.first !== null ? ` · ${tr('Opened')} ${clock(r.first)}, ${tr('Last active')} ${clock(r.last)}` : ''}`
                        return (
                            <div key={r.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={tip}>
                                <div className="relative flex w-full flex-1 flex-col justify-end">
                                    {r.expected > 0 && <div className="absolute inset-x-[-1px] border-t-2 border-gray-400/70" style={{ bottom: `${(r.expected / top) * 100}%` }} />}
                                    {over > 0 && <div className="w-full rounded-t bg-amber-400" style={{ height: `${(over / top) * 100}%` }} />}
                                    {used > 0 && <div className={`w-full ${over > 0 ? '' : 'rounded-t'} ${used >= r.expected ? 'bg-emerald-500' : 'bg-sky-400'}`} style={{ height: `${(used / top) * 100}%` }} />}
                                </div>
                                <div className={`mt-1 h-5 text-center text-[10px] leading-tight ${r.expected ? 'text-gray-500' : 'text-gray-300'}`}>{dayjs(r.day).format('dd').slice(0, 1)}<br />{dayjs(r.day).format('D')}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-sm bg-emerald-500" />{tr('Target reached')}</span>
                <span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-sm bg-sky-400" />{tr('Under target')}</span>
                <span className="inline-flex items-center gap-1"><i className="inline-block size-2 rounded-sm bg-amber-400" />{tr('Overtime')}</span>
                <span className="inline-flex items-center gap-1"><i className="inline-block h-0 w-3 border-t-2 border-gray-400/70" />{tr('Expected')}</span>
            </div>
        </section>
    )
}

/** The day by day table of one member (a person from the work hours report, with rows). */
export const WorkDays = ({ wh }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400"><th className="py-1 font-semibold">{tr('Day')}</th><th className="font-semibold">{tr('Opened')}</th><th className="font-semibold">{tr('Last active')}</th><th className="text-right font-semibold">{tr('Active')}</th><th className="text-right font-semibold">{tr('Expected')}</th></tr></thead>
            <tbody>
                {[...wh.rows].reverse().map((r) => (
                    <tr key={r.day} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="py-1.5">{dayjs(r.day).format('ddd DD MMM')}</td>
                        <td className={r.late ? 'text-red-500' : ''}>{clock(r.first)}</td>
                        <td>{clock(r.last)}</td>
                        <td className={`text-right font-semibold ${r.hours > r.expected ? 'text-amber-600' : ''}`}>{r.hours ? hm(r.hours) : '–'}</td>
                        <td className="text-right text-gray-400">{r.expected ? hm(r.expected) : '–'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

/** Who works, since when and for how long: active time in the CRM against the company's working week. */
const WorkHours = () => {
    const navigate = useNavigate()
    const [range, setRange] = useState('week')
    const [d, setD] = useState(null)
    const [error, setError] = useState('')
    useEffect(() => {
        const [a, b] = rangeOf(range)
        setD(null)
        api(`/api/crm/work-hours?from=${a.format('YYYY-MM-DD')}&to=${b.format('YYYY-MM-DD')}`).then((x) => { setD(x); setError('') }).catch((e) => setError(e.message))
    }, [range])

    const people = d?.people || []
    const top = useMemo(() => people.find((p) => p.totals.active > 0), [people])
    const sum = (f) => people.reduce((n, p) => n + f(p.totals), 0)

    return (
        <Container>
            <InvoiceHead
                title={tr('Work hours')}
                stats={[
                    { icon: <TbFlame />, label: tr('Works the most'), value: top ? top.name : '–' },
                    { icon: <TbUsers />, label: tr('Hours in the period'), value: d ? hm(sum((t) => t.active)) : '–' },
                    { icon: <TbClock />, label: tr('Overtime'), value: d ? hm(sum((t) => t.overtime)) : '–' },
                    { icon: <TbAlarm />, label: tr('Late arrivals'), value: d ? String(sum((t) => t.late)) : '–' },
                ]}
            />
            <div className="cx-tools">
                <Segment size="sm" value={range} onChange={(v) => v && setRange(Array.isArray(v) ? v[0] : v)}>
                    <Segment.Item value="today">{tr('Today')}</Segment.Item>
                    <Segment.Item value="week">{tr('This week')}</Segment.Item>
                    <Segment.Item value="last">{tr('Last week')}</Segment.Item>
                    <Segment.Item value="month">{tr('This month')}</Segment.Item>
                    <Segment.Item value="30">{tr('30 days')}</Segment.Item>
                </Segment>
                {d && <span className="text-xs text-gray-400">{dayjs(d.from).format('DD MMM')} – {dayjs(d.to).format('DD MMM YYYY')} · {d.tz}</span>}
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">{error}</div>}
            <div className="overflow-x-auto">
                <Table hoverable>
                    <THead>
                        <Tr>
                            <Th className="w-10">#</Th><Th>{tr('Member')}</Th><Th>{tr('Days worked')}</Th><Th>{tr('Active hours')}</Th><Th>{tr('Mouse / keyboard')}</Th><Th className="min-w-[180px]">{tr('Against the working week')}</Th>
                            <Th>{tr('Overtime')}</Th><Th>{tr('Usually opens at')}</Th><Th>{tr('Usually leaves at')}</Th><Th>{tr('Late')}</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {people.map((p, i) => {
                            const t = p.totals
                            return (
                                <Tr key={p.id} className="cursor-pointer" data-href={`/crm/staff/${p.id}`} onClick={() => navigate(`/crm/staff/${p.id}`)}>
                                    <Td className="text-gray-400">{i + 1}</Td>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <StaffRing id={p.id} size={30}><Avatar size={30} shape="circle" src={p.image || undefined}>{initials(p.name)}</Avatar></StaffRing>
                                            <div className="min-w-0"><div className="truncate font-semibold heading-text">{p.name}</div>{p.jobTitle && <div className="truncate text-xs text-gray-500">{p.jobTitle}</div>}</div>
                                        </div>
                                    </Td>
                                    <Td>{t.worked}</Td>
                                    <Td className="font-semibold">{hm(t.active)}</Td>
                                    <Td title={tr('Time the mouse or keyboard really moved, and its share of the active time')} className="whitespace-nowrap">{t.moving === null || t.moving === undefined ? '–' : <><span className="font-semibold">{hm(t.input)}</span> <span className="text-xs text-gray-400">{t.moving}%</span></>}</Td>
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className={`h-full rounded-full ${t.ratio > 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, t.ratio || 0)}%` }} /></div>
                                            <span className="whitespace-nowrap text-xs text-gray-500">{t.ratio === null ? '–' : `${t.ratio}%`} · {hm(t.expected)}</span>
                                        </div>
                                    </Td>
                                    <Td className={t.overtime > 0 ? 'font-semibold text-amber-600' : 'text-gray-400'}>{t.overtime > 0 ? `+${hm(t.overtime)}` : '–'}</Td>
                                    <Td>{clock(t.avgFirst)}</Td>
                                    <Td>{clock(t.avgLast)}</Td>
                                    <Td className={t.late ? 'text-red-500' : 'text-gray-400'}>{t.late || '–'}</Td>
                                </Tr>
                            )
                        })}
                    </TBody>
                </Table>
            </div>
            {d && !people.length && <div className="py-10 text-center text-gray-400">{tr('No team members to show')}</div>}
            {!d && !error && <div className="py-10 text-center text-gray-400">{tr('Loading…')}</div>}
            <p className="mt-4 text-xs text-gray-400">{tr('Hours are the time the CRM is open and in use (a click, key press or scroll in the last two minutes). Nothing outside the CRM is measured. The working week is set in Settings → Localization → Working hours.')}</p>
        </Container>
    )
}

export default WorkHours
